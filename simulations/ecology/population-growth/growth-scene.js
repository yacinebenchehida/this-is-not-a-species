/* Retained division events drive the cells. Food crumbs show the model's nutrient reserve:
   one crumb is one unit of food, which becomes one new cell. */
(function(){
  'use strict';
  const ellipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,2*Math.PI);c.fillStyle=fill;c.fill();};
  const clamp=v=>Math.max(0,Math.min(1,v));
  const centre={x:500,y:248},swim={x:343,y:122},pantry={x:290,y:96},liquid={x:396,y:158};
  // Above this many cells, crumbs are still eaten exactly, but cells no longer swim to them.
  const ANIMATED=400;
  // Growth progress at which a cell swallows its cube, just before it divides.
  const GULP=.86;
  const smoothstep=t=>{t=clamp(t);return t*t*(3-2*t);};
  const lerp=(a,b,t)=>a+(b-a)*t;
  // Seconds the swallow takes on screen.
  const GULP_TIME=.45;
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
      this.schedule=schedule;this.eventIndex=0;this.simTime=0;this.food=1;this.size=1.3;this.sprites=new Map();this.addedAt=-100;this.mood=0;this.finished=false;this.finishedAt=null;this.canvas.dataset.mood='0';
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
        e.daughters.forEach((id,k2)=>{const side=k2?1:-1;this.cells.push({...parent,id,target:null,gulpAt:undefined,gulpFrom:null,gulpSize:0,bites:0,chompAt:undefined,visualStartTime:e.time,visualStartAge:0,x:parent.x+Math.cos(parent.angle)*offset*side,y:parent.y+Math.sin(parent.angle)*offset*side,phase:parent.phase+side*.7,heading:parent.angle+(k2?0:Math.PI),angle:parent.angle+side*.1});});
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
    // Where the face sits along the cell's axis (same geometry as BacteriumCharacter), in dish units.
    mouthReach(cell){
      const r=cell.base,long=cell.kind==='round'?r*2.15:cell.kind==='bean'?r*3.25:r*3.65;
      const division=clamp((this.age(cell)-.25)/.75),growth=division<.65?division/.65:1;
      const faceX=cell.kind==='round'?0:long*.24,shift=growth*r*(cell.kind==='round'?1.3:1.8);
      return (faceX+shift+(cell.kind==='round'?r*.55:r*.35))*this.size;
    }
    age(cell){const r=this.schedule.cells[cell.id],base=cell.visualStartAge||0,start=cell.visualStartTime??r.born;return Number.isFinite(r.divide)?base+(1-base)*clamp((this.simTime-start)/(r.divide-start)):base;}
    // Cosmetic movement: gentle wandering, spacing on a grid, and swimming to a claimed crumb.
    move(dt){
      const animate=this.cells.length<=ANIMATED;
      for(const cell of this.cells){
        const crumb=animate&&cell.target;
        if(crumb){
          // Face the crumb and park the mouth on it. Mouths sit towards the cell's front end.
          const reach=this.mouthReach(cell),want=Math.atan2(crumb.y-cell.y,crumb.x-cell.x);
          let turn=want-cell.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));cell.angle+=turn*Math.min(1,dt*3);
          const gap=crumb.size*1.1,tx=crumb.x-Math.cos(cell.angle)*(reach+gap),ty=crumb.y-Math.sin(cell.angle)*(reach+gap),pull=Math.min(1,dt*1.2);
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
          if(d<min){const n=(min-d)*Math.min(.16,dt*1.9);const fa=a.target&&animate?.25:1,fb=b.target&&animate?.25:1;a.x-=dx/d*n*fa;a.y-=dy/d*n*fa;b.x+=dx/d*n*fb;b.y+=dy/d*n*fb;}
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
        if(crumb.gulped)continue;
        const fall=still?1:clamp((this.time-crumb.dropAt)/.7),y=crumb.y-(1-fall)*(1-fall)*70;
        nutrient(c,crumb.x,y,crumb.size,crumb.angle,(still?1:Math.min(1,fall*1.6))*fade);
      }
    }
    render(dt){
      if(!this.schedule)return;const still=this.reduced.matches;if(!still){this.time+=dt;this.move(dt);}
      const c=this.c;c.setTransform(this.canvas.width/1000,0,0,this.canvas.height/520,0,0);c.clearRect(0,0,1000,520);c.drawImage(this.background,0,0,1000,520);
      // Freshly added food (a top-up, or the buffet's constant supply) glows briefly where it lands.
      if(!still&&this.time-this.addedAt<1.6){c.save();c.globalAlpha=.25*(1-(this.time-this.addedAt)/1.6);ellipse(c,centre.x,centre.y,pantry.x+20,pantry.y+16,'#f3cf6c');c.restore();}
      const live=this.cells.length<=ANIMATED&&!still;
      // A cell is 'at' its cube when its mouth has reached the floating cube.
      if(live)for(const crumb of this.crumbs)crumb.atMouth=false;
      if(live)for(const cell of this.cells)if(cell.target){const reach=this.mouthReach(cell),mx=cell.x+Math.cos(cell.angle)*reach,my=cell.y+Math.sin(cell.angle)*reach;if(Math.hypot(cell.target.x-mx,cell.target.y-my)<cell.target.size*1.8+6)cell.target.atMouth=true;}
      this.drawCrumbs(c,still);
      // Big cartoon faces, which never shrink below a readable size however small the cells are.
      const faceScale=Math.min(2.2,Math.max(1.5,.8/this.size)),animate=this.cells.length<=ANIMATED&&!still;
      for(const cell of this.cells){
        const age=this.age(cell),division=still?0:clamp((age-.25)/.75);
        const near=animate&&cell.target&&cell.target.atMouth;
        // Shark-style gulp: as division nears the mouth opens wider and wider, then the whole cube
        // is swallowed at once and the mouth snaps shut. One cube becomes one new cell.
        // It swallows the cube once it is next to it and ready; a cell that never got there eats it
        // at the last moment, so the count of food stays exact.
        if(!still&&cell.target&&!cell.target.gulped&&(age>=GULP&&cell.target.atMouth||age>=.985)){
          const t=cell.target,size=t.size*Math.max(.6,Math.min(1,this.size));
          const from={x:t.x,y:t.y};
          t.gulped=true;cell.gulpAt=this.time;cell.gulpFrom=from;cell.gulpSize=size;
        }
        const sinceGulp=cell.gulpAt===undefined?Infinity:this.time-cell.gulpAt;
        let mouth=0;
        if(sinceGulp<GULP_TIME)mouth=1;
        else if(sinceGulp<GULP_TIME+.45)mouth=sinceGulp<GULP_TIME+.1?.1:.18+.12*Math.abs(Math.sin(sinceGulp*24));
        else if(near)mouth=clamp((age-.55)/(GULP-.55));
        if(!still&&(division>.015||mouth)&&this.cells.length<250){c.save();c.translate(cell.x,cell.y);c.scale(this.size,this.size);window.BacteriumCharacter.draw(c,{...cell,x:0,y:0,radius:cell.base,mood:this.mood||0,faceScale,mouth},this.time,division,still);c.restore();}
        else{c.save();c.translate(cell.x,cell.y);c.rotate(cell.angle+(still?0:Math.sin(this.time*.8+cell.phase)*.035));c.scale(this.size,this.size);c.drawImage(this.sprite(cell,faceScale),-128,-80);c.restore();}
        // The whole cube flies into the wide-open mouth and shrinks to nothing: once eaten, it is gone.
        if(!still&&sinceGulp<GULP_TIME&&cell.gulpFrom){
          const k=smoothstep(sinceGulp/GULP_TIME),reach=this.mouthReach(cell);
          const mx=cell.x+Math.cos(cell.angle)*reach,my=cell.y+Math.sin(cell.angle)*reach;
          nutrient(c,lerp(cell.gulpFrom.x,mx,k),lerp(cell.gulpFrom.y,my,k),cell.gulpSize*(1-k),(cell.target?cell.target.angle:0)+k*2,1);
        }
      }
    }
  }
  function drawMechanism(canvas){
    const c=canvas.getContext('2d');c.clearRect(0,0,900,105);c.save();c.scale(1.5,1.5);
    const cell={x:95,y:36,radius:15,base:15,angle:-.1,colour:0,kind:'rod',phase:0};
    window.BacteriumCharacter.draw(c,{...cell,mouth:1,faceScale:1.4},0,0,true);nutrient(c,32,36,6,.2);nutrient(c,52,38,5,-.1,1,1);
    window.BacteriumCharacter.draw(c,{...cell,x:295},0,.53,true);
    for(const x of [476,527])window.BacteriumCharacter.draw(c,{...cell,x,radius:13,angle:x===476?-.12:.12},0,0,true);
    for(const x of [181,390]){c.beginPath();c.moveTo(x-10,35);c.lineTo(x+10,35);c.lineTo(x+4,30);c.moveTo(x+10,35);c.lineTo(x+4,40);c.strokeStyle='#9cab8c';c.lineWidth=1.8;c.lineCap='round';c.stroke();}c.restore();
  }
  // The legend draws the same character, moods and paleness used in the dishes.
  function moodSwatch(canvas,mood){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);c.save();c.translate(w/2-4,h/2);c.scale(h/33,h/33);
    window.BacteriumCharacter.draw(c,{x:0,y:0,radius:15,base:15,angle:0,colour:0,kind:'rod',phase:0,mood,faceScale:1.5},0,0,true);c.restore();
  }
  window.GrowthDish=GrowthDish;window.NutrientArt={draw:nutrient,mechanism:drawMechanism,moodSwatch};
})();
