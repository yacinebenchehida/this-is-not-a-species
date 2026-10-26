const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../simulations/ecology/population-growth/growth-model.js');
function interfaceFor(lang){
  class Element{
    constructor(){this.value='';this.textContent='';this.writes=0;this.html='';this.handlers={};this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
    get innerHTML(){return this.html;}set innerHTML(value){this.html=value;this.writes++;}
    setAttribute(){}append(){}replaceChildren(){}addEventListener(name,fn){this.handlers[name]=fn;}
    click(){this.handlers.click?.();}
  }
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  for(const [id,value] of Object.entries({'growth-start':'4','growth-division':'30','growth-food':'48','growth-speed':'4'}))get(id).value=value;
  let frame,now=0;
  const document={documentElement:{lang},hidden:false,getElementById:get,createElementNS:()=>new Element(),querySelectorAll:()=>[],addEventListener(){}};
  class Scene{
    constructor(){this.reduced={matches:true};}
    start(schedule){this.schedule=schedule;this.eventIndex=0;}
    update(t){this.eventIndex=M.completed(this.schedule,t);}
    render(){}replenish(schedule){this.schedule=schedule;}
  }
  const context={document,window:{GrowthModel:M,GrowthDish:Scene,NutrientArt:{mechanism(){},moodSwatch(){}}},Intl,console,requestAnimationFrame:fn=>{frame=fn;}};
  const file=lang==='fr'?'../fr/simulations/ecology/population-growth/growth.js':'../simulations/ecology/population-growth/growth.js';
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context);
  return {get,advance(ms){for(let t=0;t<ms;t+=20){now+=20;frame(now);}}};
}
for(const lang of ['en','fr'])test(`${lang}: start/pause/reset work on the first click and idle frames preserve button nodes`,()=>{
  const ui=interfaceFor(lang),button=ui.get('growth-play'),clock=ui.get('growth-time'),reset=ui.get('growth-reset');
  const idleWrites=button.writes;ui.advance(1200);assert.equal(button.writes,idleWrites,'idle refreshes must not replace a pressed icon');
  for(let run=0;run<5;run++){
    button.click();assert.match(button.innerHTML,/Pause/);const playingWrites=button.writes;
    ui.advance(1500);assert.ok(Number(clock.textContent)>0);assert.equal(button.writes,playingWrites,'playing refreshes must preserve label/icon nodes');
    button.click();const pausedTime=clock.textContent,pausedWrites=button.writes;ui.advance(1000);
    assert.equal(clock.textContent,pausedTime);assert.equal(button.writes,pausedWrites);
    button.click();ui.advance(1000);assert.ok(Number(clock.textContent)>Number(pausedTime));
    reset.click();assert.equal(Number(clock.textContent),0);assert.doesNotMatch(button.innerHTML,/Pause/);
  }
});

for(const lang of ['en','fr'])test(`${lang}: each refill runs until 5% food, with an independent buffet picture and counter`,()=>{
  const ui=interfaceFor(lang),play=ui.get('growth-play'),feed=ui.get('growth-feed');
  const number=id=>Number(ui.get(id).textContent.replace(/[^0-9]/g,''));
  ui.get('growth-speed').value='18';play.click();ui.advance(12000);
  assert.match(play.innerHTML,/Pause/,'512 buffet drawings must not stop the lunchbox');
  assert.ok(number('unlimited-count')>512);
  play.click();const before=number('limited-count');feed.click();
  assert.equal(number('limited-count'),before,'a refill preserves the population');
  play.click();ui.advance(3000);
  assert.match(play.innerHTML,/Pause/,'keep running past the old time cutoff while food remains');
  assert.ok(number('limited-food-label')>5);
  for(let refill=0;refill<3;refill++){
    ui.advance(60000);
    assert.equal(play.disabled,true);assert.equal(number('limited-food-label'),5);
    const stoppedTime=ui.get('growth-time').textContent,stoppedCells=number('limited-count');
    ui.advance(2000);assert.equal(ui.get('growth-time').textContent,stoppedTime,'stop exactly at the resource threshold');
    if(refill<2){
      assert.equal(feed.disabled,false);feed.click();
      assert.equal(play.disabled,false);assert.match(play.innerHTML,/Pause/,'a refill resumes a finished run');
      assert.equal(ui.get('growth-time').textContent,stoppedTime);
      assert.equal(number('limited-count'),stoppedCells);assert.ok(number('limited-food-label')>5);
    }
  }
  assert.match(ui.get('unlimited-count').textContent,/\+$/,'the exponential counter can reach its explicit million-plus display limit');
  assert.equal(number('unlimited-count'),1000000);
});
