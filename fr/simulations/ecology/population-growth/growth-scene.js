/* Retained division events drive the cells. Food crumbs show the model's nutrient reserve:
   one crumb is one unit of food, which becomes one new cell. */
(function(){
  'use strict';
  const ellipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,2*Math.PI);c.fillStyle=fill;c.fill();};
  const clamp=v=>Math.max(0,Math.min(1,v));
  const centre={x:500,y:248},swim={x:343,y:122},pantry={x:318,y:108};
  // Above this many cells, crumbs are still eaten exactly, but cells no longer swim to them.
  const ANIMATED=400;
  function nutrient(c,x,y,size=7,angle=0,alpha=1){
    c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.lineJoin='round';
    c.beginPath();c.moveTo(-size*.55,-size);c.lineTo(size*.5,-size*.85);c.lineTo(size,size*.05);c.lineTo(size*.45,size);c.lineTo(-size*.65,size*.75);c.lineTo(-size,-size*.1);c.closePath();
    const g=c.createLinearGradient(-size,-size,size,size);g.addColorStop(0,'#fff0b4');g.addColorStop(.45,'#f4cf69');g.addColorStop(1,'#dca443');c.fillStyle=g;c.fill();c.strokeStyle='#b58431';c.lineWidth=Math.max(.8,size*.13);c.stroke();
    c.beginPath();c.moveTo(-size*.55,-size*.55);c.lineTo(size*.25,-size*.55);c.strokeStyle='#fff7d9';c.lineWidth=Math.max(1,size*.2);c.lineCap='round';c.stroke();c.restore();
  }
  // A small seeded generator gives both dishes the same starting crumb layout.
  function seeded(seed){return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  class GrowthDish extends window.DishScene {
    start(schedule,options={}){
      this.schedule=schedule;this.eventIndex=0;this.simTime=0;this.food=1;this.size=1.3;this.sprites=new Map();this.addedAt=-100;this.mood=0;this.canvas.dataset.mood='0';
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
      return {id:this.nextCrumb++,x,y,angle:this.random()*Math.PI,size:6+this.random()*1.5,owner:null,dropAt:drop?this.time:-100};
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
        e.daughters.forEach((id,k2)=>{const side=k2?1:-1;this.cells.push({...parent,id,target:null,visualStartTime:e.time,visualStartAge:0,x:parent.x+Math.cos(parent.angle)*offset*side,y:parent.y+Math.sin(parent.angle)*offset*side,phase:parent.phase+side*.7,heading:parent.angle+(k2?0:Math.PI),angle:parent.angle+side*.1});});
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
    age(cell){const r=this.schedule.cells[cell.id],base=cell.visualStartAge||0,start=cell.visualStartTime??r.born;return Number.isFinite(r.divide)?base+(1-base)*clamp((this.simTime-start)/(r.divide-start)):base;}
    // Cosmetic movement: gentle wandering, spacing on a grid, and swimming to a claimed crumb.
    move(dt){
      const animate=this.cells.length<=ANIMATED;
      for(const cell of this.cells){
        const crumb=animate&&cell.target;
        if(crumb){
          // Face the crumb and park the mouth on it. Mouths sit towards the cell's front end.
          const reach=cell.kind==='round'?0:cell.radius*1.1,want=Math.atan2(crumb.y-cell.y,crumb.x-cell.x);
          let turn=want-cell.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));cell.angle+=turn*Math.min(1,dt*3);
          const tx=crumb.x-Math.cos(cell.angle)*reach,ty=crumb.y-Math.sin(cell.angle)*reach,pull=Math.min(1,dt*2.2);
          cell.x+=(tx-cell.x)*pull;cell.y+=(ty-cell.y)*pull;cell.heading=cell.angle;
          continue;
        }
        cell.heading+=Math.sin(this.time*.49+cell.phase)*dt*.6;
        cell.x+=Math.cos(cell.heading)*cell.speed*dt;cell.y+=Math.sin(cell.heading)*cell.speed*.65*dt;
        const u=(cell.x-centre.x)/swim.x,v=(cell.y-centre.y)/swim.y,edge=Math.hypot(u,v);
        if(edge>1){cell.x=centre.x+(cell.x-centre.x)/edge;cell.y=centre.y+(cell.y-centre.y)/edge;cell.heading=Math.atan2(-v,-u)+(cell.phase%1-.5);}
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
    }
    drawCrumbs(c,still){
      const byId=new Map(this.cells.map(x=>[x.id,x]));
      for(const crumb of this.crumbs){
        // A claimed crumb is nibbled down as its owner grows: what remains is the food not yet used.
        let left=1;
        if(crumb.owner!==null){const owner=byId.get(crumb.owner);left=owner?1-this.age(owner):1;}
        if(left<=.02)continue;
        const fall=still?1:clamp((this.time-crumb.dropAt)/.7),y=crumb.y-(1-fall)*(1-fall)*70;
        nutrient(c,crumb.x,y,crumb.size*Math.sqrt(left),crumb.angle,still?1:Math.min(1,fall*1.6));
      }
    }
    render(dt){
      if(!this.schedule)return;const still=this.reduced.matches;if(!still){this.time+=dt;this.move(dt);}
      const c=this.c;c.setTransform(this.canvas.width/1000,0,0,this.canvas.height/520,0,0);c.clearRect(0,0,1000,520);c.drawImage(this.background,0,0,1000,520);
      // Freshly added food (a top-up, or the buffet's constant supply) glows briefly where it lands.
      if(!still&&this.time-this.addedAt<1.6){c.save();c.globalAlpha=.25*(1-(this.time-this.addedAt)/1.6);ellipse(c,centre.x,centre.y,pantry.x+20,pantry.y+16,'#f3cf6c');c.restore();}
      this.drawCrumbs(c,still);
      // Faces never shrink below a readable size, however small the cells are drawn.
      const faceScale=Math.min(1.8,Math.max(1,.55/this.size)),animate=this.cells.length<=ANIMATED&&!still;
      for(const cell of this.cells){
        const age=this.age(cell),division=still?0:clamp((age-.25)/.75);
        const nibbling=animate&&cell.target&&Math.hypot(cell.target.x-cell.x,cell.target.y-cell.y)<cell.radius*2.6;
        const mouth=nibbling?.45+.55*Math.abs(Math.sin(this.time*7+cell.phase)):0;
        if(!still&&(division>.015||mouth)&&this.cells.length<250){c.save();c.translate(cell.x,cell.y);c.scale(this.size,this.size);window.BacteriumCharacter.draw(c,{...cell,x:0,y:0,radius:cell.base,mood:this.mood||0,faceScale,mouth},this.time,division,still);c.restore();}
        else{c.save();c.translate(cell.x,cell.y);c.rotate(cell.angle+(still?0:Math.sin(this.time*.8+cell.phase)*.035));c.scale(this.size,this.size);c.drawImage(this.sprite(cell,faceScale),-128,-80);c.restore();}
      }
    }
  }
  function drawMechanism(canvas){
    const c=canvas.getContext('2d');c.clearRect(0,0,900,105);c.save();c.scale(1.5,1.5);
    const cell={x:95,y:36,radius:15,base:15,angle:-.1,colour:0,kind:'rod',phase:0};
    window.BacteriumCharacter.draw(c,{...cell,mouth:.9},0,0,true);nutrient(c,40,34,7,.2);nutrient(c,59,36,5,-.1);
    window.BacteriumCharacter.draw(c,{...cell,x:295},0,.53,true);
    for(const x of [476,527])window.BacteriumCharacter.draw(c,{...cell,x,radius:13,angle:x===476?-.12:.12},0,0,true);
    for(const x of [181,390]){c.beginPath();c.moveTo(x-10,35);c.lineTo(x+10,35);c.lineTo(x+4,30);c.moveTo(x+10,35);c.lineTo(x+4,40);c.strokeStyle='#9cab8c';c.lineWidth=1.8;c.lineCap='round';c.stroke();}c.restore();
  }
  // The legend draws the same character, moods and paleness used in the dishes.
  function moodSwatch(canvas,mood){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);c.save();c.translate(w/2,h/2);c.scale(h/56,h/56);
    window.BacteriumCharacter.draw(c,{x:0,y:0,radius:15,base:15,angle:0,colour:0,kind:'rod',phase:0,mood,faceScale:1.25},0,0,true);c.restore();
  }
  window.GrowthDish=GrowthDish;window.NutrientArt={draw:nutrient,mechanism:drawMechanism,moodSwatch};
})();
