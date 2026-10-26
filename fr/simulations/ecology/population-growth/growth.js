(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  try{
    const M=window.GrowthModel,scenes=[new window.GrowthDish($('unlimited-canvas')),new window.GrowthDish($('limited-canvas'))];
    const fmt=new Intl.NumberFormat(document.documentElement.lang,{maximumFractionDigits:0});
    const percentage=new Intl.NumberFormat(document.documentElement.lang,{style:'percent',maximumFractionDigits:0});
    let n0,r,end,maxEnd,time=0,running=false,stepTo=null,last=null,lastPaint=0,lastUI=0,storyKey='',focused=false,logScale=false,fedAt=-100,splitAt=null,lastDoublings=0;
    const fr=document.documentElement.lang.startsWith('fr');
    // The stories "split" when the buffet population is a quarter larger than the lunchbox population.
    const SPLIT=1.25;
    const ratio=t=>M.value(scenes[0].schedule,t)/M.value(scenes[1].schedule,t);
    // Each lunchbox cell divides at rate r x R/K: this share drives the faces and the captions.
    const share=t=>{const s=finite(),K=M.value(s,t)+M.nutrients(s,t);return K>0?M.nutrients(s,t)/K:0;};
    const moodOf=f=>f>.6?0:f>.25?1:2;
    const count=i=>n0+scenes[i].eventIndex;
    const finite=()=>scenes[1].schedule;
    function svg(tag,attrs={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;}
    function chart(){
      const s=finite(),left=47,right=970,top=24,bottom=190;
      const ceiling=focused?Math.ceil(s.K/16)*16:Math.max(64,Math.ceil(Math.max(s.K,M.value(scenes[0].schedule,time))/64)*64);
      // Log scale: powers of two are evenly spaced, so steady doubling is a straight line.
      const lo=2**Math.floor(Math.log2(n0)),hi=2**Math.ceil(Math.log2(Math.max(ceiling,n0*2)));
      const x=t=>left+t/end*(right-left),y=logScale?n=>bottom-(Math.log2(Math.max(lo,n))-Math.log2(lo))/(Math.log2(hi)-Math.log2(lo))*(bottom-top):n=>bottom-n/ceiling*(bottom-top);
      const g=svg('svg',{viewBox:'0 0 1000 230',role:'img','aria-label':focused?'La population limitée et l’effectif que les nutriments peuvent soutenir.':'Évolution des effectifs dans les deux boîtes.'});
      const ticks=logScale?Array.from({length:Math.round(Math.log2(hi/lo))+1},(_,i)=>lo*2**i):[0,1,2,3,4].map(i=>ceiling*i/4);
      for(const value of ticks){const yy=y(value);g.append(svg('line',{x1:left,x2:right,y1:yy,y2:yy,stroke:'#e7e4d3'}));g.append(svg('text',{x:left-10,y:yy+4,'text-anchor':'end',class:'chart-tick'},fmt.format(value)));}
      for(let i=0;i<=4;i++)g.append(svg('text',{x:x(end*i/4),y:bottom+18,'text-anchor':'middle',class:'chart-tick'},fmt.format(end*i/4)));
      if(splitAt!==null&&splitAt<=time){
        g.append(svg('line',{x1:x(splitAt),x2:x(splitAt),y1:top,y2:bottom,stroke:'#d8734b','stroke-width':1.3,'stroke-dasharray':'3 4'}));
        g.append(svg('text',{x:Math.min(right-150,x(splitAt)+6),y:bottom-8,class:'chart-tick split-label'},fr?'Les histoires se séparent':'The stories split'));
      }
      g.append(svg('text',{x:left,y:12,class:'chart-axis'},'Bactéries'));
      g.append(svg('text',{x:510,y:225,'text-anchor':'middle',class:'chart-axis'},'Temps (minutes)'));
      for(let i=0;i<s.segments.length;i++){
        const segment=s.segments[i],until=s.segments[i+1]?.time??end;
        g.append(svg('line',{x1:x(segment.time),x2:x(until),y1:y(segment.K),y2:y(segment.K),stroke:'#89966e','stroke-width':1.5,'stroke-dasharray':'2 5'}));
        if(i){
          g.append(svg('line',{x1:x(segment.time),x2:x(segment.time),y1:top,y2:bottom,stroke:'#cbad62','stroke-width':1,'stroke-dasharray':'4 5'}));
          g.append(svg('circle',{cx:x(segment.time),cy:y(segment.n),r:4,fill:'#e4b94f',stroke:'#a48130','stroke-width':1}));
          if(i===s.segments.length-1)g.append(svg('text',{x:Math.min(right-100,x(segment.time)+7),y:15,class:'chart-tick'},'Nutriments ajoutés'));
        }
      }
      for(let i=focused?1:0;i<2;i++){
        const points=[];for(let j=0;j<=160;j++){const t=time*j/160;points.push(x(t).toFixed(2)+','+y(M.value(scenes[i].schedule,t)).toFixed(2));}
        const colour=i?'#d8734b':'#267b79',yy=y(M.value(scenes[i].schedule,time));
        g.append(svg('polyline',{points:points.join(' '),fill:'none',stroke:colour,'stroke-width':3,'stroke-linejoin':'round','stroke-dasharray':i?'9 5':''}));
        g.append(svg('circle',{cx:x(time),cy:yy,r:4,fill:colour,stroke:'#fffbf1','stroke-width':2}));
      }
      $('growth-chart').replaceChildren(g);$('unlimited-chart-key').hidden=focused;
      $('growth-chart-focus').setAttribute('aria-pressed',String(focused));
      $('growth-chart-focus').textContent=focused?'Voir les deux populations':'Observer le ralentissement';
      $('growth-chart-log').setAttribute('aria-pressed',String(logScale));
      $('growth-chart-log').textContent=logScale?(fr?'Échelle normale':'Normal scale'):(fr?'Échelle logarithmique':'Échelle logarithmique');
      $('chart-view-note').textContent=logScale?(fr?'Sur cette échelle, un doublement régulier devient une ligne droite.':'On this scale, steady doubling becomes a straight line.'):focused?'La population limitée vue de plus près.':'Les deux populations à la même échelle.';
    }
    function update(full=false){
      const s=finite(),unlimited=M.value(scenes[0].schedule,time),limited=M.value(s,time);
      // Each dish shrinks its drawings to fit its own population, from 10 cells on, so the dishes
      // never look full (space is not limiting here) and the smaller lunchbox crowd stays readable.
      const fit=n=>Math.max(.22,Math.min(1.3,1.3*Math.sqrt(10/Math.max(10,n))));
      const food=s.K===n0?0:M.nutrients(s,time)/(s.K-n0),f=share(time);
      scenes[0].update(time,fit(unlimited),1,0);scenes[1].update(time,fit(limited),food,moodOf(f));
      if(!full)return;
      $('growth-time').textContent=fmt.format(time);$('unlimited-count').textContent=fmt.format(count(0));$('limited-count').textContent=fmt.format(count(1));
      $('limited-food-bar').style.width=food*100+'%';$('limited-food-label').textContent=percentage.format(food);
      $('unlimited-canvas').setAttribute('aria-label',fr?`${count(0)} bactéries au buffet à volonté.`:`${count(0)} bacteria at the endless buffet.`);
      $('limited-canvas').setAttribute('aria-label',fr?`${count(1)} bactéries avec un seul panier-repas.`:`${count(1)} bacteria sharing one lunchbox.`);
      $('unlimited-phase').textContent=time===0?'Nutriments prêts. Cellules prêtes.':count(0)<n0*4?'Absorber. Grandir. Se diviser.':'Davantage de cellules grandissent et se divisent.';
      $('limited-phase').textContent=s.K===n0?'Pas encore de nourriture. Des cellules affamées attendent de grandir.':time-fedAt<18?'Nourriture fraîche. Visages contents, croissance plus rapide.':time===0?'Nutriments prêts. Cellules prêtes.':f>.6?'Beaucoup de nourriture. Des cellules actives et contentes.':f>.25?'La nourriture se fait rare. Les cellules se divisent plus lentement.':'Cellules affamées : il ne reste presque rien pour grandir.';
      // Doubling counter for the buffet dish: 4 → 8 → 16 → …
      const doublings=Math.max(0,Math.floor(Math.log2(count(0)/n0)+1e-9)),chain=Array.from({length:doublings+1},(_,i)=>fmt.format(n0*2**i));
      const shown=chain.length>5?['…',...chain.slice(-4)]:chain;
      $('doubling-line').textContent=doublings?(fr?`A doublé ${doublings} fois : ${shown.join(' → ')}`:`Doubled ${doublings} ${doublings===1?'time':'times'}: ${shown.join(' → ')}`):(fr?`Compteur de doublements : ${fmt.format(n0)}`:`Doubling counter: ${fmt.format(n0)}`);
      if(doublings>lastDoublings&&!scenes[0].reduced.matches){const el=$('doubling-line');el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
      lastDoublings=doublings;
      const split=splitAt!==null&&time-splitAt<25&&time>=splitAt;
      const done=time>=end,canExtend=end<maxEnd-1e-8,key=done?'end':time-fedAt<18?'fed':s.K===n0?'empty':time===0?'start':split?'split':f<.25?'low':count(0)>=n0*4?'many':'first';
      if(key!==storyKey){
        $('growth-story').textContent=done?(canExtend?'La première observation s’arrête ici. Remplissez le panier-repas et continuez à regarder.':'Notre observation s’arrête ici. Au buffet, la croissance continuerait.'):key==='fed'?'Nourriture fraîche dans le panier-repas. Les mêmes cellules peuvent de nouveau grandir plus vite.':key==='empty'?'Le panier-repas est vide. Remplissez-le pour que les cellules grandissent.':key==='start'?'Chaque miette dorée peut devenir une nouvelle cellule. Regardez-les se faire manger.':key==='split'?'Ici, les histoires se séparent : la boîte du panier-repas prend du retard car sa nourriture s’épuise.':key==='low'?'Le panier-repas est presque vide. Remplissez-le et observez ce qui se passe.':key==='many'?'Au buffet, plus de cellules signifie plus de divisions. Le panier-repas se vide.':'Au coude à coude pour l’instant : les deux boîtes ont de quoi manger.';
        storyKey=key;
      }
      $('growth-play').innerHTML=running||stepTo!==null?'Pause <span aria-hidden="true">Ⅱ</span>':done?'Recommencer <span aria-hidden="true">↻</span>':time>0?'Continuer <span aria-hidden="true">▶</span>':'Les voir grandir <span aria-hidden="true">▶</span>';
      $('growth-feed').disabled=done&&!canExtend||s.K-n0>=192;
      $('growth-feed-label').textContent=done&&canExtend?'Remplir et continuer':'Remplir le panier-repas';
      $('growth-feed').classList.toggle('is-useful',!done&&food<.35);
      $('feed-hint').textContent=done?(canExtend?'Nourrir les mêmes cellules et poursuivre le récit.':'Limite d’observation atteinte. Recommencez pour une nouvelle expérience.'):s.K-n0>=192?'Le panier-repas est aussi plein que possible pour cette expérience.':'Même population. De nouveaux nutriments.';
      $('growth-result').textContent=time===0?'Observez deux populations grandir à partir du même effectif.':fr?(splitAt===null?`Au coude à coude : ${count(0)} au buffet, ${count(1)} avec le panier-repas, à ${fmt.format(time)} minutes.`:`${fmt.format(time)} minutes : ${count(0)} au buffet, ${count(1)} avec le panier-repas.`):(splitAt===null?`Neck and neck: ${count(0)} at the buffet, ${count(1)} with the lunchbox, at ${fmt.format(time)} minutes.`:`${fmt.format(time)} minutes : ${count(0)} at the buffet, ${count(1)} with the lunchbox.`);
      chart();
    }
    function reset(){
      n0=Number($('growth-start').value);r=Math.LN2/Number($('growth-division').value);const supply=Number($('growth-food').value);end=Math.min(240,M.crossing(512,n0,r));maxEnd=Math.min(480,M.crossing(1024,n0,r));
      time=0;running=false;stepTo=null;storyKey='';fedAt=-100;splitAt=null;lastDoublings=0;scenes[0].start(M.schedule(n0,r),{crumbs:Math.max(24,supply)});scenes[1].start(M.schedule(n0,r,n0+supply));
      const levels={0:'Aucune',24:'Petite',48:'Moyenne',72:'Grande',96:'Abondante'};
      $('food-capacity-label').textContent=levels[supply];$('growth-food').setAttribute('aria-valuetext',levels[supply]);update(true);
    }
    $('growth-play').addEventListener('click',()=>{if(running||stepTo!==null){running=false;stepTo=null;}else{if(time>=end)reset();running=true;}update(true);});
    $('growth-reset').addEventListener('click',reset);
    $('growth-feed').addEventListener('click',()=>{if(time>=end&&end>=maxEnd-1e-8||finite().K-n0>=192)return;const resume=time>=end;scenes[1].replenish(M.feed(finite(),time,Math.min(Number($('growth-food').value)||24,192-(finite().K-n0))));fedAt=time;storyKey='';end=Math.min(maxEnd,Math.max(end,time+Math.LN2/r));if(resume){running=true;stepTo=null;}update(true);});
    $('growth-chart-focus').addEventListener('click',()=>{focused=!focused;chart();});
    $('growth-chart-log').addEventListener('click',()=>{logScale=!logScale;chart();});
    for(const id of ['growth-start','growth-division'])$(id).addEventListener('change',reset);
    $('growth-food').addEventListener('input',reset);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){running=false;stepTo=null;update(true);}last=null;});
    function frame(now){
      const dt=last===null?0:Math.max(0,(now-last)/1000);last=now;
      if(!document.hidden){
        if(running||stepTo!==null){const before=time;time=Math.min(end,stepTo===null?end:stepTo,time+dt*(stepTo===null?Number($('growth-speed').value):10));if(splitAt===null&&ratio(time)>=SPLIT){let a=before,b=time;for(let k=0;k<40;k++){const m=(a+b)/2;if(ratio(m)>=SPLIT)b=m;else a=m;}splitAt=b;storyKey='';}if(time>=end)running=false;if(stepTo!==null&&time>=stepTo)stepTo=null;update();}
        if(now-lastUI>120){update(true);lastUI=now;}
        if(now-lastPaint>=1000/30){for(const s of scenes)s.render(Math.min(.1,(now-lastPaint)/1000));lastPaint=now;}
      }
      requestAnimationFrame(frame);
    }
    reset();window.NutrientArt.mechanism($('growth-mechanism'));document.querySelectorAll('canvas.mood-face').forEach(el=>window.NutrientArt.moodSwatch(el,Number(el.dataset.mood)));$('growth-app').hidden=false;$('growth-loading').hidden=true;requestAnimationFrame(frame);
  }catch(error){$('growth-loading').textContent='Impossible d’ouvrir les boîtes. Veuillez recharger la page.';console.error('Croissance des populations:',error);}
})();
