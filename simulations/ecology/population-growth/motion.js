(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  try {
    const model=window.DivisionStory,scene=new window.DishScene($('dish-canvas'));
    let elapsed=0,running=false,last=null,lastPaint=0,lastCount=-1,lastPhase='';
    function update(){
      const state=model.state(elapsed);scene.sync(state);
      const active=state.divisions.some(d=>d.progress>0&&d.progress<1);
      const phase=state.done?'A little more company.':elapsed===0?'Small beginnings.':active?'One becomes two.':'Room for a little more life.';
      if(lastPhase!==phase){$('dish-phase').textContent=phase;lastPhase=phase;}
      $('dish-line').textContent=state.done?'Eight cells have become sixteen. Each original cell divided once.':elapsed===0?'Watch a cell stretch, pinch in the middle, and become two.':'A cell grows, then divides into two daughter cells.';
      if(lastCount!==state.count){
        $('cell-count').textContent=String(state.count);
        $('dish-status').textContent=state.count===8?'Eight cells, ready to divide.':`${state.count} bacteria in the dish.`;
        $('dish-canvas').setAttribute('aria-label',`${state.count} colourful cartoon bacteria in a glass dish. Each original cell divides into two daughter cells.`);
        lastCount=state.count;
      }
      $('dish-play').innerHTML=running?'Pause <span aria-hidden="true">Ⅱ</span>':state.done?'Watch again <span aria-hidden="true">↻</span>':elapsed>0?'Continue <span aria-hidden="true">▶</span>':'Watch them divide <span aria-hidden="true">▶</span>';
      return state;
    }
    function reset(){elapsed=0;running=false;lastCount=-1;scene.reset();update();}
    $('dish-play').addEventListener('click',()=>{if(elapsed>=model.duration)reset();running=!running;update();});
    $('dish-reset').addEventListener('click',reset);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){running=false;update();}});
    scene.reduced.addEventListener('change',()=>{scene.flashes=[];update();scene.render(0);});
    function frame(now){
      const dt=last===null?0:Math.max(0,(now-last)/1000);last=now;
      if(!document.hidden){
        if(running){elapsed=Math.min(model.duration,elapsed+dt*Number($('dish-tempo').value));if(elapsed===model.duration)running=false;update();}
        if(now-lastPaint>=1000/30){scene.render(Math.min(.1,(now-lastPaint)/1000));lastPaint=now;}
      }
      requestAnimationFrame(frame);
    }
    reset();$('dish-app').hidden=false;$('dish-loading').hidden=true;requestAnimationFrame(frame);
  }catch(error){$('dish-loading').textContent='The dish could not open. Please reload the page.';console.error('Petri Dish preview:',error);}
})();
