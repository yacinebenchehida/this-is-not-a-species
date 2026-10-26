(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  try{
    const M=window.GrowthModel,scenes=[new window.GrowthDish($('unlimited-canvas')),new window.GrowthDish($('limited-canvas'))];
    const fmt=new Intl.NumberFormat(document.documentElement.lang,{maximumFractionDigits:0});
    let n0,r,K,end,time=0,running=false,stepTo=null,last=null,lastPaint=0,lastUI=0,storyKey='';
    const count=i=>n0+scenes[i].eventIndex;
    function svg(tag,attrs={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;}
    function chart(){
      const left=47,right=970,top=19,bottom=190,ceiling=Math.max(64,Math.ceil(Math.max(K,M.population(time,n0,r))/64)*64);
      const x=t=>left+t/end*(right-left),y=n=>bottom-n/ceiling*(bottom-top);
      const g=svg('svg',{viewBox:'0 0 1000 230',role:'img','aria-label':'Population size through time in the two dishes.'});
      for(let i=0;i<=4;i++){
        const value=ceiling*i/4,yy=y(value);g.append(svg('line',{x1:left,x2:right,y1:yy,y2:yy,stroke:'#e7e4d3'}));g.append(svg('text',{x:left-10,y:yy+4,'text-anchor':'end',class:'chart-tick'},fmt.format(value)));
        const t=end*i/4;g.append(svg('text',{x:x(t),y:bottom+18,'text-anchor':'middle',class:'chart-tick'},fmt.format(t)));
      }
      g.append(svg('text',{x:left,y:11,class:'chart-axis'},'Bacteria'));
      g.append(svg('text',{x:510,y:225,'text-anchor':'middle',class:'chart-axis'},'Time (minutes)'));
      g.append(svg('line',{x1:left,x2:right,y1:y(K),y2:y(K),stroke:'#89966e','stroke-width':1.5,'stroke-dasharray':'2 5'}));
      for(let i=0;i<2;i++){
        const points=[];for(let j=0;j<=120;j++){const t=time*j/120;points.push(x(t).toFixed(2)+','+y(M.population(t,n0,r,i?K:Infinity)).toFixed(2));}
        const colour=i?'#d8734b':'#267b79',yy=y(M.population(time,n0,r,i?K:Infinity));
        g.append(svg('polyline',{points:points.join(' '),fill:'none',stroke:colour,'stroke-width':3,'stroke-linejoin':'round','stroke-dasharray':i?'9 5':''}));
        g.append(svg('circle',{cx:x(time),cy:yy,r:4,fill:colour,stroke:'#fffbf1','stroke-width':2}));
      }
      $('growth-chart').replaceChildren(g);
    }
    function update(full=false){
      const unlimited=M.population(time,n0,r),size=Math.min(1.45,1.45*Math.sqrt(32/Math.max(32,unlimited))),food=M.remaining(time,n0,r,K);
      scenes[0].update(time,size,1);scenes[1].update(time,size,food);
      if(!full)return;
      $('growth-time').textContent=fmt.format(time);$('unlimited-count').textContent=fmt.format(count(0));$('limited-count').textContent=fmt.format(count(1));
      $('limited-food-bar').style.width=food*100+'%';$('limited-food-label').textContent=new Intl.NumberFormat(document.documentElement.lang,{style:'percent',maximumFractionDigits:0}).format(food);
      $('unlimited-canvas').setAttribute('aria-label',`${count(0)} bacteria with replenished food.`);
      $('limited-canvas').setAttribute('aria-label',`${count(1)} bacteria with a limited food supply.`);
      $('unlimited-phase').textContent=time===0?'A few little beginnings.':count(0)<n0*4?'More cells, more divisions.':'More and more little lives.';
      $('limited-phase').textContent=time===0?'A few little beginnings.':food>.55?'Growing, with food to spare.':food>.2?'Less food. A gentler pace.':'Nearly at the food-supported limit.';
      const done=time>=end,key=done?'end':time===0?'start':food<.2?'low':count(0)>=n0*4?'many':'first';
      if(key!==storyKey){$('growth-story').textContent=done?'Our viewing window ends here. With unlimited food, growth would continue.':key==='start'?'A cell divides into two. Then its daughters can divide too.':key==='low'?'The limited dish is running low on food. Fewer divisions, but still plenty of life.':key==='many'?'No cell is dividing faster. There are simply more cells dividing.':'Both populations grow. The limited dish gradually uses up its food.';storyKey=key;}
      $('growth-play').innerHTML=running||stepTo!==null?'Pause <span aria-hidden="true">Ⅱ</span>':done?'Grow again <span aria-hidden="true">↻</span>':time>0?'Continue <span aria-hidden="true">▶</span>':'Let them grow <span aria-hidden="true">▶</span>';
      $('growth-step').disabled=running||stepTo!==null||done;
      $('growth-result').textContent=time===0?'Watch the two populations grow from the same starting point.':`${fmt.format(time)} minutes: ${count(0)} with replenished food, ${count(1)} with one serving.`;
      chart();
    }
    function reset(){
      n0=Number($('growth-start').value);r=Math.LN2/Number($('growth-division').value);K=Number($('growth-food').value);end=Math.min(240,M.crossing(512,n0,r));
      time=0;running=false;stepTo=null;storyKey='';scenes[0].start(M.schedule(n0,r));scenes[1].start(M.schedule(n0,r,K));
      $('food-capacity-label').textContent=`${K} bacteria`;
      $('food-capacity-note').textContent=`Enough food to support about ${K} bacteria in the limited dish.`;
      $('growth-food').setAttribute('aria-valuetext',`Supports about ${K} bacteria`);update(true);
    }
    $('growth-play').addEventListener('click',()=>{if(running||stepTo!==null){running=false;stepTo=null;}else{if(time>=end)reset();running=true;}update(true);});
    $('growth-step').addEventListener('click',()=>{if(!running&&stepTo===null&&time<end){stepTo=Math.min(end,time+10);update(true);}});
    $('growth-reset').addEventListener('click',reset);
    for(const id of ['growth-start','growth-division'])$(id).addEventListener('change',reset);
    $('growth-food').addEventListener('input',reset);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){running=false;stepTo=null;update(true);}last=null;});
    function frame(now){
      const dt=last===null?0:Math.max(0,(now-last)/1000);last=now;
      if(!document.hidden){
        if(running||stepTo!==null){time=Math.min(end,stepTo===null?end:stepTo,time+dt*(stepTo===null?Number($('growth-speed').value):10));if(time>=end)running=false;if(stepTo!==null&&time>=stepTo)stepTo=null;update();}
        if(now-lastUI>120){update(true);lastUI=now;}
        if(now-lastPaint>=1000/30){for(const s of scenes)s.render(Math.min(.1,(now-lastPaint)/1000));lastPaint=now;}
      }
      requestAnimationFrame(frame);
    }
    reset();$('growth-app').hidden=false;$('growth-loading').hidden=true;requestAnimationFrame(frame);
  }catch(error){$('growth-loading').textContent='The growing dishes could not open. Please reload the page.';console.error('Population growth:',error);}
})();
