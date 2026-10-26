const {test}=require('node:test');
const assert=require('node:assert/strict');
const {state,duration,initialCount}=require('../simulations/ecology/population-growth/division-model.js');

test('each founding cell divides exactly once, adding one cell at completion',()=>{
  const events=state(duration).divisions;
  assert.deepEqual(events.map(e=>e.parent).sort(),[0,1,2,3,4,5,6,7]);
  for(let i=0;i<events.length;i++){
    const finish=1+i*2.6+2.8;
    assert.equal(state(finish-.00001).count,initialCount+i);
    assert.equal(state(finish+.00001).count,initialCount+i+1);
  }
  assert.equal(state(duration).count,16);
});
test('playback sampling and replay preserve the same division state',()=>{
  for(const speed of [.65,1,1.6]){
    let t=0;while(t<duration)t=Math.min(duration,t+speed/30);
    assert.deepEqual(state(t),state(duration));
  }
  assert.deepEqual(state(12),state(12));
  assert.equal(state(0).count,8);
  assert.equal(state(-1).time,0);
  assert.deepEqual(state(duration+100),state(duration));
  assert.throws(()=>state(NaN),RangeError);
});
