/* Retained division events drive the cells. Food crumbs show the model's nutrient reserve:
   one crumb is one unit of food, which becomes one new cell. */
(function(){
  'use strict';
  const ellipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,2*Math.PI);c.fillStyle=fill;c.fill();};
  const clamp=v=>Math.max(0,Math.min(1,v));
  const centre={x:500,y:248},swim={x:343,y:122},pantry={x:290,y:96},liquid={x:396,y:158};
  // Above this many cells, crumbs are still eaten exactly, but cells no longer swim to them.
  const ANIMATED=400;
  const smoothstep=t=>{t=clamp(t);return t*t*(3-2*t);};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ENGULF={duration:1.8,mouth:1.4};
  // Wall-clock choreography never delays a numerical birth. Dense/fast scenes use a shorter take.
  function gulpPose(elapsed,duration=ENGULF.duration){
    const t=clamp(elapsed/duration);let mouth=0,travel=0,stretchX=1,stretchY=1,satisfied=0;
    if(t<.14){const k=Math.sin(t/.14*Math.PI);mouth=.12*k;travel=-.06*k;stretchX=1-.07*k;stretchY=1+.07*k;}
    else if(t<.47){const k=smoothstep((t-.14)/.33);mouth=ENGULF.mouth*k;travel=k;stretchX=1+.12*Math.sin(k*Math.PI);stretchY=1-.07*Math.sin(k*Math.PI);}
    else if(t<.65){mouth=ENGULF.mouth;travel=1;}
    else if(t<.75){const k=smoothstep((t-.65)/.1);mouth=ENGULF.mouth*(1-k);travel=1;stretchX=1-.09*k;stretchY=1+.09*k;}
    else{const k=(t-.75)/.25,bump=Math.sin(Math.min(1,k*2)*Math.PI)**2*(1-k);travel=1;mouth=k<.6?.12+.16*bump:0;stretchX=1+.07*bump;stretchY=1-.06*bump;satisfied=smoothstep(k/.65);}
    return {mouth,travel,stretchX,stretchY,satisfied,visible:t<.75,closed:t>=.75,done:elapsed>=duration};
  }
  const GULP_WORD='Miam !';
  // A sugar cube seen from above at a slight angle: light top, two shaded sides, a few sparkly
  // grains. bites (0–3) removes rounded chunks, like a cartoon bite mark.
  const BITES=[[.9,-.55],[-.9,-.35],[.1,.95]];
  function nutrient(c,x,y,size=7,angle=0,alpha=1,bites=0){
    c.save();c.translate(x,y);c.rotate(angle*.35);c.globalAlpha=alpha;c.lineJoin='round';
    const s=size,d=s*.45;
    if(bites>0){
      // Even-odd clipping: the cube's box minus one circle per bite.
      c.beginPath();c.rect(-s*2,-s*2,s*4,s*4);
      for(let i=0;i<Math.min(3,bites);i++){const [bx,by]=BITES[i];c.moveTo(bx*s+s*.62,by*s);c.arc(bx*s,by*s,s*.62,0,Math.PI*2);}
      c.clip('evenodd');
    }
    c.beginPath();c.moveTo(-s,-s+d);c.lineTo(-s+d,-s);c.lineTo(s,-s);c.lineTo(s,s-d);c.lineTo(s-d,s);c.lineTo(-s,s);c.closePath();
    c.fillStyle='#e9e3d2';c.fill();
    c.beginPath();c.rect(-s,-s+d,s*2-d,s*2-d);c.fillStyle='#fffdf6';c.fill();
    c.beginPath();c.moveTo(s-d,-s+d);c.lineTo(s,-s);c.lineTo(s,s-d);c.lineTo(s-d,s);c.closePath();c.fillStyle='#ddd4bd';c.fill();
    c.beginPath();c.moveTo(-s,-s+d);c.lineTo(-s+d,-s);c.lineTo(s,-s);c.lineTo(s-d,-s+d);c.closePath();c.fillStyle='#f6f1e3';c.fill();
    c.beginPath();c.moveTo(-s,-s+d);c.lineTo(-s+d,-s);c.lineTo(s,-s);c.lineTo(s,s-d);c.lineTo(s-d,s);c.lineTo(-s,s);c.closePath();
    c.strokeStyle='#a99c7a';c.lineWidth=Math.max(.8,s*.12);c.stroke();
    if(s>4){for(const [gx,gy] of [[-.45,-.1],[.15,.35],[-.1,.7],[.35,-.25]])c.fillRect(gx*s,gy*s,Math.max(1,s*.12),Math.max(1,s*.12));}
    c.restore();
  }
  // A small seeded generator gives both dishes the same starting crumb layout.
  function seeded(seed){return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  class GrowthDish extends window.DishScene {
    start(schedule,options={}){
      this.schedule=schedule;this.eventIndex=0;this.simTime=0;this.lastAdvanceAt=-Infinity;this.food=1;this.size=1.3;this.sprites=new Map();this.addedAt=-100;this.mood=0;this.finished=false;this.finishedAt=null;this.canvas.dataset.mood='0';
      const seats=schedule.n0===4?[[300,192],[665,192],[355,310],[680,310]]:[[242,200],[390,145],[580,155],[750,220],[660,305],[455,325],[450,235],[280,310],[570,265],[355,205],[530,350],[710,170]];
      this.cells=Array.from({length:schedule.n0},(_,id)=>({id,x:seats[id][0],y:seats[id][1],angle:[-.45,.15,-.6,.6,.8,.2][id%6],colour:id%3,kind:['rod','round','bean'][id%3],base:22+(id%3),radius:23,visualStartTime:0,visualStartAge:0,phase:id*1.81,heading:id*2.17,speed:6+id%4}));
      // The lunchbox shows exactly its reserve, K − N0 crumbs. The buffet starts with the same
      // number of free crumbs and keeps that many free: food keeps arriving.
      this.random=seeded(17);this.crumbs=[];this.nextCrumb=0;
      this.freeTarget=schedule.K===Infinity?Math.max(1,options.crumbs||24):0;
      const count=schedule.K===Infinity?this.freeTarget:schedule.K-schedule.n0;
      for(let i=0;i<count;i++)this.crumbs.push(this.newCrumb(false));
      this.canvas.dataset.cells=String(this.cells.length);this.canvas.dataset.crumbs=String(this.crumbs.length);
    }
    newCrumb(drop){
      let x,y;do{x=centre.x+(this.random()*2-1)*pantry.x;y=centre.y+(this.random()*2-1)*pantry.y;}while(((x-centre.x)/pantry.x)**2+((y-centre.y)/pantry.y)**2>1);
      return {id:this.nextCrumb++,x,y,angle:this.random()*Math.PI,size:9+this.random()*1.2,owner:null,dropAt:drop?this.time:-100};
    }
    replenish(schedule){
      for(const cell of this.cells){cell.visualStartAge=this.age(cell);cell.visualStartTime=this.simTime;}
      const added=Math.round(schedule.K-this.schedule.K);
      this.schedule=schedule;this.addedAt=this.time;
      for(let i=0;i<added;i++)this.crumbs.push(this.newCrumb(true));
      this.canvas.dataset.crumbs=String(this.crumbs.length);
    }
    update(time,size,food,mood=0){
      if(time>this.simTime)this.lastAdvanceAt=this.time;
      this.simTime=time;this.size=size;this.food=food;
      if(mood!==this.mood){this.mood=mood;this.canvas.dataset.mood=String(mood);}
      for(const c of this.cells)c.radius=c.base*size;
      while(this.eventIndex<this.schedule.events.length&&this.schedule.events[this.eventIndex].time<=time+1e-10){
        const e=this.schedule.events[this.eventIndex++],parent=this.cells.find(c=>c.id===e.parent),offset=parent.radius*(parent.kind==='round'?1.3:1.8);
        // The dividing cell has finished its crumb: exactly one unit of food per new cell.
        let k=this.crumbs.findIndex(c=>c.owner===parent.id);
        if(k<0)k=this.nearestFree(parent);
        if(k>=0)this.crumbs.splice(k,1);
        this.cells=this.cells.filter(c=>c!==parent);
        e.daughters.forEach((id,k2)=>{const side=k2?1:-1;this.cells.push({...parent,id,target:null,gulpAt:undefined,gulpFrom:null,gulpOrigin:null,gulpSpot:null,gulpDuration:0,visualStartTime:e.time,visualStartAge:0,x:parent.x+Math.cos(parent.angle)*offset*side,y:parent.y+Math.sin(parent.angle)*offset*side,phase:parent.phase+side*.7,heading:parent.angle+(k2?0:Math.PI),angle:parent.angle+side*.1});});
      }
      this.claim();
      this.canvas.dataset.cells=String(this.cells.length);this.canvas.dataset.crumbs=String(this.crumbs.length);this.canvas.dataset.nutrients=String(food);
    }
    nearestFree(cell){
      let best=-1,bestD=Infinity;
      for(let i=0;i<this.crumbs.length;i++){const c=this.crumbs[i];if(c.owner!==null)continue;const d=(c.x-cell.x)**2+(c.y-cell.y)**2;if(d<bestD){bestD=d;best=i;}}
      return best;
    }
    // Each cell that has started growing towards its next division takes one free crumb.
    claim(){
      for(const cell of this.cells){
        if(cell.target||!Number.isFinite(this.schedule.cells[cell.id].divide)||this.age(cell)<=0)continue;
        const k=this.nearestFree(cell);if(k<0)break;
        this.crumbs[k].owner=cell.id;cell.target=this.crumbs[k];
        if(this.freeTarget)this.crumbs.push(this.newCrumb(true));
      }
    }
    // Sprites are cached by appearance; mood and face size change the drawing.
    sprite(cell,faceScale){
      const mood=this.mood||0,key=cell.colour+'-'+cell.kind+'-'+mood+'-'+faceScale.toFixed(1);
      if(!this.sprites.has(key)){const s=document.createElement('canvas');s.width=256;s.height=160;const c=s.getContext('2d');c.translate(128,80);window.BacteriumCharacter.draw(c,{...cell,x:0,y:0,angle:0,radius:cell.base,mood,faceScale},0,0,true);this.sprites.set(key,s);}
      return this.sprites.get(key);
    }
    // Distance from the cell's centre to its front tip, in dish units.
    frontReach(cell){
      const r=cell.base,long=cell.kind==='round'?r*2.15:cell.kind==='bean'?r*3.25:r*3.65;
      const division=clamp((this.age(cell)-.25)/.75),growth=division<.65?division/.65:1;
      return (long*(1+growth*.9)/2+2)*this.size;
    }
    // Use the character's own face frame, including squash/stretch, rather than an approximate tip.
    mouthGeom(cell,m,faceScale,division=clamp((this.age(cell)-.25)/.75),pose={}){
      const f=window.BacteriumCharacter.faceFrame({...cell,radius:cell.base,faceScale},division);
      const {w,h,cy}=window.BacteriumCharacter.mouthShape(m),sx=pose.stretchX||1,sy=pose.stretchY||1;
      const lx=f.x*this.size*sx,ly=(f.y+cy*faceScale)*this.size*sy;
      const ca=Math.cos(cell.angle),sa=Math.sin(cell.angle);
      return {x:cell.x+lx*ca-ly*sa,y:cell.y+lx*sa+ly*ca,w:w*faceScale*this.size*sx,h:h*faceScale*this.size*sy,angle:cell.angle,ox:lx*ca-ly*sa,oy:lx*sa+ly*ca};
    }
    age(cell){const r=this.schedule.cells[cell.id],base=cell.visualStartAge||0,start=cell.visualStartTime??r.born;return Number.isFinite(r.divide)?base+(1-base)*clamp((this.simTime-start)/(r.divide-start)):base;}
    // Cosmetic movement: gentle wandering, spacing on a grid, and swimming to a claimed crumb.
    move(dt){
      const animate=this.cells.length<=ANIMATED;
      for(const cell of this.cells){
        if(cell.gulpAt!==undefined&&this.time-cell.gulpAt<cell.gulpDuration+.25)continue;
        const crumb=animate&&cell.target;
        if(crumb){
          // Face the crumb and park the mouth on it. Mouths sit towards the cell's front end.
          const want=Math.atan2(crumb.y-cell.y,crumb.x-cell.x);
          let turn=want-cell.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));cell.angle+=turn*Math.min(1,dt*3);
          const stop=this.frontReach(cell)+crumb.size*2.3,tx=crumb.x-Math.cos(cell.angle)*stop,ty=crumb.y-Math.sin(cell.angle)*stop,pull=Math.min(1,dt*1.2);
          cell.x+=(tx-cell.x)*pull;cell.y+=(ty-cell.y)*pull;cell.heading=cell.angle;
        }else{
          cell.heading+=Math.sin(this.time*.49+cell.phase)*dt*.6;
          cell.x+=Math.cos(cell.heading)*cell.speed*dt;cell.y+=Math.sin(cell.heading)*cell.speed*.65*dt;
        }
        this.keepInside(cell);
      }
      // Spacing keeps faces legible. A grid keeps it fast with a thousand cells.
      const size=Math.max(8,46*this.size),grid=new Map();
      for(const cell of this.cells){const key=Math.floor(cell.x/size)+','+Math.floor(cell.y/size);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(cell);}
      for(const a of this.cells){
        const gx=Math.floor(a.x/size),gy=Math.floor(a.y/size);
        for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const b of grid.get((gx+i)+','+(gy+j))||[]){
          if(b.id<=a.id)continue;
          const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,min=(a.radius+b.radius)*1.45;
          if(d<min){const n=(min-d)*Math.min(.16,dt*1.9);const fa=a.gulpAt!==undefined&&this.time-a.gulpAt<a.gulpDuration?0:a.target&&animate?.25:1,fb=b.gulpAt!==undefined&&this.time-b.gulpAt<b.gulpDuration?0:b.target&&animate?.25:1;a.x-=dx/d*n*fa;a.y-=dy/d*n*fa;b.x+=dx/d*n*fb;b.y+=dy/d*n*fb;}
        }
      }
      for(const cell of this.cells)this.keepInside(cell);
    }
    // Cells always stay inside the dish, whatever they are doing.
    keepInside(cell){
      const r=cell.base,long=cell.kind==='round'?r*2.15:cell.kind==='bean'?r*3.25:r*3.65;
      const division=clamp((this.age(cell)-.25)/.75),growth=division<.65?division/.65:1;
      const half=(long*(1+growth*.9)/2+(cell.kind==='round'?8:2))*this.size,side=(r+(cell.kind==='round'?8:2))*this.size;
      const ca=Math.abs(Math.cos(cell.angle)),sa=Math.abs(Math.sin(cell.angle));
      const ax=Math.max(30,liquid.x-half*ca-side*sa),ay=Math.max(16,liquid.y-half*sa-side*ca);
      const u=(cell.x-centre.x)/ax,v=(cell.y-centre.y)/ay,edge=Math.hypot(u,v);
      if(edge>1){cell.x=centre.x+(cell.x-centre.x)/edge;cell.y=centre.y+(cell.y-centre.y)/edge;if(!cell.target)cell.heading=Math.atan2(-v,-u)+(cell.phase%1-.5);}
    }
    drawCrumbs(c,still){
      // When the observation ends, the buffet's cubes fade away so only the cells remain.
      if(this.finished&&this.finishedAt===null)this.finishedAt=this.time;
      if(!this.finished)this.finishedAt=null;
      const fade=this.finishedAt===null?1:still?0:clamp(1-(this.time-this.finishedAt)/1.2);
      if(fade<=0)return;
      for(const crumb of this.crumbs){
        // Cubes stay whole until a cell swallows one just before dividing.
        if(crumb.gulped||!still&&crumb.atMouth)continue;
        const fall=still?1:clamp((this.time-crumb.dropAt)/.7),y=crumb.y-(1-fall)*(1-fall)*70;
        nutrient(c,crumb.x,y,crumb.size,crumb.angle,(still?1:Math.min(1,fall*1.6))*fade);
      }
    }
    render(dt){
      if(!this.schedule)return;const still=this.reduced.matches;if(!still){this.time+=dt;this.move(dt);}
      const c=this.c;c.setTransform(this.canvas.width/1000,0,0,this.canvas.height/520,0,0);c.clearRect(0,0,1000,520);c.drawImage(this.background,0,0,1000,520);
      // Freshly added food (a top-up, or the buffet's constant supply) glows briefly where it lands.
      if(!still&&this.time-this.addedAt<1.6){c.save();c.globalAlpha=.25*(1-(this.time-this.addedAt)/1.6);ellipse(c,centre.x,centre.y,pantry.x+20,pantry.y+16,'#f3cf6c');c.restore();}
      const faceScale=Math.min(2.2,Math.max(1.5,.8/this.size));
      const animate=this.cells.length<250&&!still;
      // Claimed cubes are drawn with their owner, keeping food behind the jaw but inside the mouth.
      if(!still)for(const crumb of this.crumbs)crumb.atMouth=animate&&crumb.owner!==null;
      this.drawCrumbs(c,still);
      for(const cell of this.cells){
        const age=this.age(cell),rawDivision=still?0:clamp((age-.25)/.75);
        const rec=this.schedule.cells[cell.id];
        const left=Number.isFinite(rec.divide)?(rec.divide-this.simTime)/Math.max(.1,this.minutesPerSecond||4):Infinity;
        const take=this.cells.length<=40?ENGULF.duration:this.cells.length<=100?1.1:.65;
        if(animate&&this.time-this.lastAdvanceAt<.15&&cell.target&&!cell.target.gulped&&left<=take+.3){
          const t=cell.target,g=this.mouthGeom(cell,ENGULF.mouth,faceScale,Math.min(rawDivision,.64));
          // Meet partway: a short body lunge plus a whole cube sliding into the waiting jaws.
          const dx=t.x-g.x,dy=t.y-g.y,d=Math.hypot(dx,dy),reach=Math.min(1,cell.radius*1.35/Math.max(1,d));
          const aim={...cell,x:cell.x+dx*reach,y:cell.y+dy*reach};this.keepInside(aim);
          cell.gulpOrigin={x:cell.x,y:cell.y};cell.gulpSpot={x:aim.x+g.ox,y:aim.y+g.oy};
          cell.gulpFrom={x:t.x,y:t.y};cell.gulpAt=this.time;cell.gulpDuration=Math.max(.12,Math.min(take,left-.12));
          cell.gulpAngle=t.angle;cell.gulpSize=t.size;t.gulped=true;
        }
        const elapsed=cell.gulpAt===undefined?Infinity:this.time-cell.gulpAt;
        const active=animate&&elapsed<cell.gulpDuration;
        const pose=active?gulpPose(elapsed,cell.gulpDuration):{mouth:0,stretchX:1,stretchY:1,satisfied:0};
        // Show eating before the two daughter faces emerge. Births retain their exact model times.
        const release=cell.gulpAt===undefined?1:smoothstep((elapsed-cell.gulpDuration)/.23);
        const division=still?0:lerp(Math.min(rawDivision,.64),rawDivision,release);
        if(active){
          const g=this.mouthGeom(cell,ENGULF.mouth,faceScale,division,pose);
          cell.x=lerp(cell.gulpOrigin.x,cell.gulpSpot.x-g.ox,pose.travel);
          cell.y=lerp(cell.gulpOrigin.y,cell.gulpSpot.y-g.oy,pose.travel);
        }
        let food=null;
        if(active&&pose.visible){
          const k=smoothstep(clamp(pose.travel));
          food={x:lerp(cell.gulpFrom.x,cell.gulpSpot.x,k),y:lerp(cell.gulpFrom.y,cell.gulpSpot.y,k),size:cell.gulpSize,angle:cell.gulpAngle};
        }else if(animate&&cell.target&&!cell.target.gulped)food=cell.target;
        // The cube stays full-sized. The advancing body hides it, while the mouth window reveals it.
        const drawFood=ctx=>nutrient(ctx,food.x,food.y,food.size,food.angle,1);
        if(food)drawFood(c);
        if(!still&&(division>.015||active)&&this.cells.length<250){
          const contents=food&&active?ctx=>{ctx.save();ctx.setTransform(this.canvas.width/1000,0,0,this.canvas.height/520,0,0);drawFood(ctx);ctx.restore();}:null;
          c.save();c.translate(cell.x,cell.y);c.scale(this.size,this.size);
          window.BacteriumCharacter.draw(c,{...cell,...pose,x:0,y:0,radius:cell.base,mood:this.mood||0,faceScale},this.time,division,still,contents);c.restore();
        }else{
          c.save();c.translate(cell.x,cell.y);c.rotate(cell.angle+(still?0:Math.sin(this.time*.8+cell.phase)*.035));c.scale(this.size,this.size);c.drawImage(this.sprite(cell,faceScale),-128,-80);c.restore();
        }
        // Keep the comic reaction brief and sparse when a dish becomes crowded.
        if(active&&pose.closed&&this.cells.length<=40){
          const k=clamp((elapsed/cell.gulpDuration-.75)/.25),pop=Math.min(1,k*6),y=cell.y-cell.radius*1.6-12*k;
          c.save();c.globalAlpha=Math.sin(k*Math.PI);c.translate(cell.x,y);c.scale(.7+.3*pop,.7+.3*pop);
          c.font='700 17px Georgia,serif';c.textAlign='center';c.lineJoin='round';c.lineWidth=4;c.strokeStyle='#fffaf0';c.strokeText(GULP_WORD,0,0);c.fillStyle='#d8734b';c.fillText(GULP_WORD,0,0);c.restore();
        }
      }
    }
  }
  function drawMechanism(canvas){
    const c=canvas.getContext('2d');c.clearRect(0,0,900,105);c.save();c.scale(1.5,1.5);
    const cell={x:95,y:36,radius:15,base:15,angle:-.1,colour:0,kind:'rod',phase:0};
    // One small cube waits just outside the right-hand lip, aligned with the open mouth.
    const mouth=window.BacteriumCharacter.mouthShape(1),face=window.BacteriumCharacter.faceFrame(cell);
    window.BacteriumCharacter.draw(c,{...cell,mouth:1,faceScale:1.4},0,0,true);
    c.save();c.translate(cell.x,cell.y);c.rotate(cell.angle);
    nutrient(c,face.x+(mouth.w+2.3)*1.4+7,face.y+mouth.cy*1.4+4,5,-.2);c.restore();
    window.BacteriumCharacter.draw(c,{...cell,x:295},0,.53,true);
    for(const x of [476,527])window.BacteriumCharacter.draw(c,{...cell,x,radius:13,angle:x===476?-.12:.12},0,0,true);
    for(const x of [181,390]){c.beginPath();c.moveTo(x-10,35);c.lineTo(x+10,35);c.lineTo(x+4,30);c.moveTo(x+10,35);c.lineTo(x+4,40);c.strokeStyle='#9cab8c';c.lineWidth=1.8;c.lineCap='round';c.stroke();}c.restore();
  }
  // The legend draws the same character, moods and paleness used in the dishes.
  function moodSwatch(canvas,mood){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);c.save();c.translate(w/2-4,h/2);c.scale(h/33,h/33);
    window.BacteriumCharacter.draw(c,{x:0,y:0,radius:15,base:15,angle:0,colour:0,kind:'rod',phase:0,mood,faceScale:1.5},0,0,true);c.restore();
  }
  window.FeedingAnimation={pose:gulpPose,duration:ENGULF.duration};window.GrowthDish=GrowthDish;window.NutrientArt={draw:nutrient,mechanism:drawMechanism,moodSwatch};
})();
