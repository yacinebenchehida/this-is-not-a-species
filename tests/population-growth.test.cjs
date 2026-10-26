const {test}=require('node:test');const assert=require('node:assert/strict');
const M=require('../simulations/ecology/population-growth/growth-model.js');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('exact exponential doubling and logistic differential equation',()=>{
  for(const n0 of [4,8,12])for(const T of [20,30,60]){
    const r=Math.LN2/T;close(M.population(0,n0,r),n0);close(M.population(T,n0,r),2*n0);
    for(const K of [24,48,96])for(const t of [0,10,60,180,240]){
      const n=M.population(t,n0,r,K),d=.001;assert.ok(n>=n0&&n<K);assert.ok(n<=M.population(t,n0,r)+1e-9);
      if(t)close((M.population(t+d,n0,r,K)-M.population(Math.max(0,t-d),n0,r,K))/(t?2*d:d),r*n*(1-n/K));
    }
  }
});
test('integer crossings invert the curves and every event replaces one parent by two daughters',()=>{
  for(const K of [24,48,96,Infinity]){
    const s=M.schedule(4,Math.LN2/30,K),alive=new Set([0,1,2,3]);let previous=0;
    s.events.forEach((e,i)=>{assert.ok(e.time>previous);previous=e.time;close(M.population(e.time,4,s.r,K),5+i);assert.ok(alive.delete(e.parent));e.daughters.forEach(id=>{assert.ok(!alive.has(id));alive.add(id);assert.equal(s.cells[id].born,e.time);});assert.equal(alive.size,5+i);});
    assert.equal(M.completed(s,0),0);assert.equal(M.completed(s,1e6),s.events.length);
    if(K!==Infinity)assert.equal(alive.size,K-1);
  }
});
test('playback batching does not change count, zero growth and boundaries stay well defined',()=>{
  const s=M.schedule(8,Math.LN2/20),end=M.crossing(512,8,s.r);
  for(const dt of [.01,.1,1,37]){let t=0,total=0;while(t<end){t=Math.min(end,t+dt);total=M.completed(s,t);}assert.equal(total,504);}
  assert.equal(M.population(200,8,0,48),8);assert.equal(M.schedule(8,0).events.length,0);assert.equal(M.population(200,8,1,8),8);
  assert.equal(M.crossing(48,8,1,48),Infinity);close(M.remaining(0,8,1,48),1);assert.ok(M.remaining(10,8,1,48)<.01);
  assert.throws(()=>M.population(-1,4,1),RangeError);assert.throws(()=>M.schedule(4,-1),RangeError);assert.throws(()=>M.schedule(4,1,2),RangeError);
});
test('drawn cells match retained events after small steps, fast jumps and a reset',()=>{
  const context={window:{DishScene:class{constructor(){this.canvas={dataset:{}};}}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../simulations/ecology/population-growth/growth-scene.js'),'utf8'),context);
  for(const K of [24,96,Infinity]){
    const s=M.schedule(12,Math.LN2/20,K),end=Math.min(240,M.crossing(512,12,s.r)),expected=new Set(Array.from({length:12},(_,i)=>i));
    for(const e of s.events.filter(e=>e.time<=end+1e-10)){expected.delete(e.parent);e.daughters.forEach(id=>expected.add(id));}
    for(const dt of [.17,7,end]){
      const scene=new context.window.GrowthDish();scene.start(s);let t=0;
      while(t<end){t=Math.min(end,t+dt);scene.update(t,.5,1);assert.equal(scene.cells.length,12+M.completed(s,t));assert.equal(Number(scene.canvas.dataset.cells),scene.cells.length);}
      assert.deepEqual(new Set(Array.from(scene.cells,c=>c.id)),expected);
      for(const e of s.events){const original=s.cells[e.parent];assert.equal(original.divide,e.time);}
      scene.start(s);scene.update(0,1,1);assert.equal(scene.cells.length,12);assert.equal(scene.eventIndex,0);
    }
  }
});
test('reduced-motion rendering keeps every cell and suppresses ambient motion and stretching',()=>{
  let draws=0;const c=new Proxy({drawImage:()=>draws++,createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
  const context={window:{DishScene:class{constructor(){this.canvas={dataset:{},width:1000,height:520};this.c=c;this.time=0;this.reduced={matches:true};}move(){throw new Error('Ambient movement must stay off');}},BacteriumCharacter:{draw(){throw new Error('No stretching in reduced motion');}}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../simulations/ecology/population-growth/growth-scene.js'),'utf8'),context);
  const scene=new context.window.GrowthDish();scene.start(M.schedule(4,Math.LN2/30,48));scene.update(120,1,.3);scene.sprite=()=>({});
  const before=JSON.stringify(scene.cells);scene.render(1);assert.equal(JSON.stringify(scene.cells),before);assert.equal(scene.time,0);assert.equal(draws,scene.cells.length+1);
});
test('nutrients are conserved during growth and replenishment increases growth without adding cells',()=>{
  for(const amount of [24,48,96])for(const time of [0,14.7,60,120,180]){
    const s=M.schedule(4,Math.LN2/30,28),before=M.value(s,time),stock=M.nutrients(s,time),fed=M.feed(s,time,amount);
    close(M.value(fed,time),before);close(M.nutrients(fed,time),stock+amount);
    assert.equal(M.completed(fed,time),M.completed(s,time));
    for(const t of [time,time+10,time+60]){close(M.value(fed,t)+M.nutrients(fed,t),s.K+amount);assert.ok(M.nutrients(fed,t)<=stock+amount+1e-9);}
    assert.ok(M.value(fed,time+10)>M.value(s,time+10));
    for(const t of [0,time/2].filter(t=>t<time)){close(M.value(fed,t),M.value(s,t));close(M.nutrients(fed,t),M.nutrients(s,t));}
    const alive=new Set([0,1,2,3]);let previous=0;
    fed.events.forEach((e,i)=>{assert.ok(e.time>previous);previous=e.time;assert.ok(alive.delete(e.parent));e.daughters.forEach(id=>alive.add(id));assert.equal(alive.size,5+i);close(M.value(fed,e.time),5+i);});
    assert.deepEqual(fed.events.slice(0,M.completed(s,time)),s.events.slice(0,M.completed(s,time)));
  }
});
test('multiple nutrient additions preserve the existing rendered lineage and later event processing',()=>{
  const context={window:{DishScene:class{constructor(){this.canvas={dataset:{}};this.time=0;}}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../simulations/ecology/population-growth/growth-scene.js'),'utf8'),context);
  const scene=new context.window.GrowthDish();let s=M.schedule(4,Math.LN2/30,28);scene.start(s);
  for(const t of [70,120,150]){
    scene.update(t,1,1);const ids=Array.from(scene.cells,c=>c.id),n=M.value(s,t);s=M.feed(s,t,24);scene.replenish(s);scene.update(t,1,1);
    assert.deepEqual(Array.from(scene.cells,c=>c.id),ids);close(M.value(s,t),n);
  }
  for(let t=150;t<=240;t+=.7){scene.update(t,.5,.2);assert.equal(scene.cells.length,4+M.completed(s,t));}
  const zero=M.feed(M.schedule(4,0,28),10,24);assert.equal(M.value(zero,100),4);assert.equal(zero.events.length,0);
  assert.throws(()=>M.feed(s,140,24),RangeError);assert.throws(()=>M.feed(s,200,0),RangeError);assert.throws(()=>M.feed(M.schedule(4,1),0,24),RangeError);
});
test('an empty nutrient reserve prevents growth until replenishment, without instant cell growth',()=>{
  const context={window:{DishScene:class{constructor(){this.canvas={dataset:{}};this.time=0;}}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../simulations/ecology/population-growth/growth-scene.js'),'utf8'),context);
  for(const initialReserve of [0,24,48]){
    const s=M.schedule(4,Math.LN2/30,4+initialReserve),scene=new context.window.GrowthDish();scene.start(s);scene.update(120,1,0);
    const before=Array.from(scene.cells,c=>({id:c.id,age:scene.age(c)}));
    const fed=M.feed(s,120,24);scene.replenish(fed);
    for(let i=0;i<scene.cells.length;i++){assert.equal(scene.cells[i].id,before[i].id);close(scene.age(scene.cells[i]),before[i].age);}
    if(initialReserve===0){assert.equal(scene.cells.length,4);assert.equal(M.nutrients(s,120),0);assert.equal(M.value(s,120),4);assert.ok(scene.cells.every(c=>scene.age(c)===0));}
    scene.update(150,1,.5);assert.ok(scene.cells.length>before.length);assert.equal(scene.cells.length,4+M.completed(fed,150));
  }
});
