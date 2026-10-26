(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  try {
    const model=window.DivisionStory,scene=new window.DishScene($('dish-canvas'));
    let elapsed=0,running=false,last=null,lastPaint=0,lastCount=-1,lastPhase='';
    function update(){
      const state=model.state(elapsed);scene.sync(state);
      const active=state.divisions.some(d=>d.progress>0&&d.progress<1);
      const phase=state.done?'Et voilà de la compagnie.':elapsed===0?'Tout commence petit.':active?'Une cellule en donne deux.':'Un peu de place pour la vie.';
      if(lastPhase!==phase){$('dish-phase').textContent=phase;lastPhase=phase;}
      $('dish-line').textContent=state.done?'De huit cellules à seize : chaque cellule de départ s’est divisée une fois.':elapsed===0?'Regardez une cellule s’allonger, se resserrer au milieu et se diviser en deux.':'Une cellule grandit, puis se divise en deux cellules filles.';
      if(lastCount!==state.count){
        $('cell-count').textContent=String(state.count);
        $('dish-status').textContent=state.count===8?'Huit cellules, prêtes à se diviser.':`${state.count} bactéries dans la boîte.`;
        $('dish-canvas').setAttribute('aria-label',`${state.count} bactéries colorées dans une boîte en verre. Chaque cellule de départ se divise en deux cellules filles.`);
        lastCount=state.count;
      }
      $('dish-play').innerHTML=running?'Pause <span aria-hidden="true">Ⅱ</span>':state.done?'Revoir la scène <span aria-hidden="true">↻</span>':elapsed>0?'Continuer <span aria-hidden="true">▶</span>':'Les voir se diviser <span aria-hidden="true">▶</span>';
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
  }catch(error){$('dish-loading').textContent='Impossible d’ouvrir la boîte. Veuillez recharger la page.';console.error('Petri Dish preview:',error);}
})();
