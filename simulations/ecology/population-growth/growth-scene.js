/* Positions and decoration never set birth times. Each character is one retained cell. */
(function(){
  'use strict';
  const ellipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,2*Math.PI);c.fillStyle=fill;c.fill();};
  class GrowthDish extends window.DishScene {
    start(schedule){
      this.schedule=schedule;this.eventIndex=0;this.simTime=0;this.food=1;this.size=1.45;this.sprites=new Map();
      const seats=schedule.n0===4?[[300,192],[665,192],[355,310],[680,310]]:[[242,200],[390,145],[580,155],[750,220],[660,305],[455,325],[450,235],[280,310],[570,265],[355,205],[530,350],[710,170]];
      this.cells=Array.from({length:schedule.n0},(_,id)=>({id,x:seats[id][0],y:seats[id][1],angle:[-.45,.15,-.6,.6,.8,.2][id%6],colour:id%3,kind:['rod','round','bean'][id%3],base:22+(id%3),radius:23,phase:id*1.81,heading:id*2.17,speed:6+id%4}));
      this.canvas.dataset.cells=String(this.cells.length);
    }
    update(time,size,food){
      this.simTime=time;this.size=size;this.food=food;for(const c of this.cells)c.radius=c.base*size;
      // Process every event, including those between screen refreshes.
      while(this.eventIndex<this.schedule.events.length&&this.schedule.events[this.eventIndex].time<=time+1e-10){
        const e=this.schedule.events[this.eventIndex++],parent=this.cells.find(c=>c.id===e.parent),offset=parent.radius*(parent.kind==='round'?1.3:1.8);
        this.cells=this.cells.filter(c=>c!==parent);
        e.daughters.forEach((id,k)=>{const side=k?1:-1;this.cells.push({...parent,id,x:parent.x+Math.cos(parent.angle)*offset*side,y:parent.y+Math.sin(parent.angle)*offset*side,phase:parent.phase+side*.7,heading:parent.angle+(k?0:Math.PI),angle:parent.angle+side*.1});});
      }
      this.canvas.dataset.cells=String(this.cells.length);
    }
    sprite(cell){
      const key=cell.colour+'-'+cell.kind;
      if(!this.sprites.has(key)){const s=document.createElement('canvas');s.width=256;s.height=160;const c=s.getContext('2d');c.translate(128,80);window.BacteriumCharacter.draw(c,{...cell,x:0,y:0,angle:0,radius:cell.base},0,0,true);this.sprites.set(key,s);}
      return this.sprites.get(key);
    }
    render(dt){
      if(!this.schedule)return;const still=this.reduced.matches;if(!still){this.time+=dt;this.move(dt);}
      const c=this.c;c.setTransform(this.canvas.width/1000,0,0,this.canvas.height/520,0,0);c.clearRect(0,0,1000,520);c.drawImage(this.background,0,0,1000,520);
      // Particles are a gauge of the same remaining-food fraction as the bar.
      for(let i=0;i<66;i++){
        const a=i*2.399963,r=Math.sqrt((i+.5)/66),x=500+Math.cos(a)*r*365,y=248+Math.sin(a)*r*138,alpha=Math.max(0,Math.min(1,this.food*66-i));if(alpha<=0)continue;
        c.globalAlpha=alpha*.8;const bob=still?0:Math.sin(this.time*.6+i)*2;ellipse(c,x,y+bob,3.8,3.8,'#e8b84c');ellipse(c,x-1,y+bob-1,1.4,1.4,'#fff0a2');
      }
      c.globalAlpha=1;
      for(const cell of this.cells){
        const record=this.schedule.cells[cell.id],age=Number.isFinite(record.divide)?Math.min(1,(this.simTime-record.born)/(record.divide-record.born)):0,division=still?0:Math.max(0,(age-.45)/.55);
        if(division>.015&&this.cells.length<180){c.save();c.translate(cell.x,cell.y);c.scale(this.size,this.size);window.BacteriumCharacter.draw(c,{...cell,x:0,y:0,radius:cell.base},this.time,division,still);c.restore();}
        else{c.save();c.translate(cell.x,cell.y);c.rotate(cell.angle+(still?0:Math.sin(this.time*.8+cell.phase)*.035));c.scale(this.size,this.size);c.drawImage(this.sprite(cell),-128,-80);c.restore();}
      }
    }
  }
  window.GrowthDish=GrowthDish;
})();
