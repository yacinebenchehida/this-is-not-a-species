/* Retained division events drive the cells. Nutrient parcels illustrate their growth material. */
(function(){
  'use strict';
  const ellipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,2*Math.PI);c.fillStyle=fill;c.fill();};
  const clamp=v=>Math.max(0,Math.min(1,v));
  function nutrient(c,x,y,size=7,angle=0,alpha=1){
    c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.lineJoin='round';
    c.beginPath();c.moveTo(-size*.55,-size);c.lineTo(size*.5,-size*.85);c.lineTo(size,size*.05);c.lineTo(size*.45,size);c.lineTo(-size*.65,size*.75);c.lineTo(-size,-size*.1);c.closePath();
    const g=c.createLinearGradient(-size,-size,size,size);g.addColorStop(0,'#fff0b4');g.addColorStop(.45,'#f4cf69');g.addColorStop(1,'#dca443');c.fillStyle=g;c.fill();c.strokeStyle='#b58431';c.lineWidth=Math.max(.8,size*.13);c.stroke();
    c.beginPath();c.moveTo(-size*.55,-size*.55);c.lineTo(size*.25,-size*.55);c.strokeStyle='#fff7d9';c.lineWidth=Math.max(1,size*.2);c.lineCap='round';c.stroke();c.restore();
  }
  class GrowthDish extends window.DishScene {
    start(schedule){
      this.schedule=schedule;this.eventIndex=0;this.simTime=0;this.food=1;this.size=1.45;this.sprites=new Map();this.addedAt=-100;
      const seats=schedule.n0===4?[[300,192],[665,192],[355,310],[680,310]]:[[242,200],[390,145],[580,155],[750,220],[660,305],[455,325],[450,235],[280,310],[570,265],[355,205],[530,350],[710,170]];
      this.cells=Array.from({length:schedule.n0},(_,id)=>({id,x:seats[id][0],y:seats[id][1],angle:[-.45,.15,-.6,.6,.8,.2][id%6],colour:id%3,kind:['rod','round','bean'][id%3],base:22+(id%3),radius:23,visualStartTime:0,visualStartAge:0,phase:id*1.81,heading:id*2.17,speed:6+id%4}));
      this.canvas.dataset.cells=String(this.cells.length);
    }
    replenish(schedule){for(const cell of this.cells){cell.visualStartAge=this.age(cell);cell.visualStartTime=this.simTime;}this.schedule=schedule;this.addedAt=this.time;}
    update(time,size,food){
      this.simTime=time;this.size=size;this.food=food;for(const c of this.cells)c.radius=c.base*size;
      while(this.eventIndex<this.schedule.events.length&&this.schedule.events[this.eventIndex].time<=time+1e-10){
        const e=this.schedule.events[this.eventIndex++],parent=this.cells.find(c=>c.id===e.parent),offset=parent.radius*(parent.kind==='round'?1.3:1.8);
        this.cells=this.cells.filter(c=>c!==parent);
        e.daughters.forEach((id,k)=>{const side=k?1:-1;this.cells.push({...parent,id,visualStartTime:e.time,visualStartAge:0,x:parent.x+Math.cos(parent.angle)*offset*side,y:parent.y+Math.sin(parent.angle)*offset*side,phase:parent.phase+side*.7,heading:parent.angle+(k?0:Math.PI),angle:parent.angle+side*.1});});
      }
      this.canvas.dataset.cells=String(this.cells.length);this.canvas.dataset.nutrients=String(food);
    }
    sprite(cell){
      const key=cell.colour+'-'+cell.kind;
      if(!this.sprites.has(key)){const s=document.createElement('canvas');s.width=256;s.height=160;const c=s.getContext('2d');c.translate(128,80);window.BacteriumCharacter.draw(c,{...cell,x:0,y:0,angle:0,radius:cell.base},0,0,true);this.sprites.set(key,s);}
      return this.sprites.get(key);
    }
    age(cell){const r=this.schedule.cells[cell.id],base=cell.visualStartAge||0,start=cell.visualStartTime??r.born;return Number.isFinite(r.divide)?base+(1-base)*clamp((this.simTime-start)/(r.divide-start)):base;}
    stock(c,still){
      // A tiny tray of angular nutrient parcels; its fill follows the actual remaining reserve.
      const x=500,y=69,pulse=still?0:clamp(1-(this.time-this.addedAt)/2);
      if(pulse){ellipse(c,x,y,62+Math.sin(this.time*5)*3,28,'#f3cf6c35');}
      c.beginPath();c.roundRect(x-47,y-17,94,35,10);c.fillStyle='#fff9e9';c.fill();c.strokeStyle='#bdac7c';c.lineWidth=1.5;c.stroke();
      const pieces=this.food*12;
      for(let i=0;i<12;i++)if(pieces>i)nutrient(c,x-32+(i%6)*13,y-6+Math.floor(i/6)*14,5.5,(i%3-1)*.18,clamp(pieces-i));
      // Replenished food visibly arrives from outside the unlimited dish.
      if(this.schedule.K===Infinity&&!still){const p=(this.time*.65)%1;nutrient(c,x+4,y-42+p*21,5.5,.2,Math.sin(p*Math.PI));}
    }
    render(dt){
      if(!this.schedule)return;const still=this.reduced.matches;if(!still){this.time+=dt;this.move(dt);}
      const c=this.c;c.setTransform(this.canvas.width/1000,0,0,this.canvas.height/520,0,0);c.clearRect(0,0,1000,520);c.drawImage(this.background,0,0,1000,520);this.stock(c,still);
      const feeding=[];
      for(const cell of this.cells){
        const age=this.age(cell),division=still?0:clamp((age-.25)/.75);
        if(!still&&age>.08&&age<.53)feeding.push({cell,age});
        if(!still&&age>.43&&age<.61&&this.cells.length<100){c.save();c.globalAlpha=.2*Math.sin((age-.43)/.18*Math.PI);ellipse(c,cell.x,cell.y,cell.radius*2.1,cell.radius*1.5,'#f9df80');c.restore();}
        if(division>.015&&this.cells.length<180){c.save();c.translate(cell.x,cell.y);c.scale(this.size,this.size);window.BacteriumCharacter.draw(c,{...cell,x:0,y:0,radius:cell.base},this.time,division,still);c.restore();}
        else{c.save();c.translate(cell.x,cell.y);c.rotate(cell.angle+(still?0:Math.sin(this.time*.8+cell.phase)*.035));c.scale(this.size,this.size);c.drawImage(this.sprite(cell),-128,-80);c.restore();}
      }
      // Parcels travel to the actual cells preparing to divide. Positions never alter the numerical uptake.
      // A handful are highlighted at a time so dense populations remain legible.
      for(const {cell,age} of feeding.slice(0,10)){
        const p=clamp((age-.08)/.45),u=1-p,source={x:500,y:84},control={x:(500+cell.x)/2,y:Math.min(145,cell.y-45)};
        const x=u*u*source.x+2*u*p*control.x+p*p*cell.x,y=u*u*source.y+2*u*p*control.y+p*p*cell.y;
        c.save();c.globalAlpha=.16;c.strokeStyle='#c49a48';c.lineWidth=1.3;c.setLineDash([3,5]);c.beginPath();c.moveTo(source.x,source.y);c.quadraticCurveTo(control.x,control.y,cell.x,cell.y);c.stroke();c.restore();
        nutrient(c,x,y,Math.max(4.5,8*this.size)*(1-clamp((p-.85)/.15)),cell.angle*.2,1-clamp((p-.9)/.1));
      }
    }
  }
  function drawMechanism(canvas){
    const c=canvas.getContext('2d');c.clearRect(0,0,900,105);c.save();c.scale(1.5,1.5);
    const cell={x:95,y:36,radius:15,base:15,angle:-.1,colour:0,kind:'rod',phase:0};
    window.BacteriumCharacter.draw(c,cell,0,0,true);nutrient(c,40,34,7,.2);nutrient(c,59,36,5,-.1);
    window.BacteriumCharacter.draw(c,{...cell,x:295},0,.53,true);
    for(const x of [476,527])window.BacteriumCharacter.draw(c,{...cell,x,radius:13,angle:x===476?-.12:.12},0,0,true);
    for(const x of [181,390]){c.beginPath();c.moveTo(x-10,35);c.lineTo(x+10,35);c.lineTo(x+4,30);c.moveTo(x+10,35);c.lineTo(x+4,40);c.strokeStyle='#9cab8c';c.lineWidth=1.8;c.lineCap='round';c.stroke();}c.restore();
  }
  window.GrowthDish=GrowthDish;window.NutrientArt={draw:nutrient,mechanism:drawMechanism};
})();
