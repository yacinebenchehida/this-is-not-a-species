/* Cosmetic movement in a schematic dish of liquid; division uses the retained story state. */
(function () {
  'use strict';
  const W=1000,H=520,centre={x:500,y:248},rim={x:417,y:177};
  const initial=[
    [238,211,-.42,0,'rod',20], [399,137,.05,1,'round',22],
    [590,153,-.62,2,'rod',21], [750,218,.22,0,'round',23],
    [656,300,.64,1,'rod',22], [455,325,.83,2,'bean',21],
    [451,238,.21,0,'bean',23], [276,310,-.2,2,'round',22]
  ];
  function ellipse(c,x,y,rx,ry,fill) {c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}}
  class DishScene {
    constructor(canvas) {
      this.canvas=canvas;this.c=canvas.getContext('2d');if(!this.c)throw new Error('Canvas unavailable');
      this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)');this.time=0;
      this.background=document.createElement('canvas');this.background.width=1500;this.background.height=780;
      const c=this.background.getContext('2d');c.scale(1.5,1.5);this.paintDish(c);
      new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();this.reset();
    }
    resize(){const w=this.canvas.clientWidth||1000,dpr=Math.min(2,window.devicePixelRatio||1);this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(w*H/W*dpr);}
    reset(){this.cells=initial.map(([x,y,angle,colour,kind,radius],id)=>({id,x,y,angle,colour,kind,radius,phase:id*1.81,heading:id*2.17,speed:5+id%4,turn:0}));this.completed=new Set();this.flashes=[];}
    paintDish(c) {
      // A shallow glass wall, soft contact shadow, translucent rim and a light-filled surface.
      c.save();c.shadowColor='#496c5a24';c.shadowBlur=25;c.shadowOffsetY=13;
      ellipse(c,centre.x,centre.y+25,rim.x+5,rim.y+2,'#51766c10');c.restore();
      const side=c.createLinearGradient(0,centre.y,0,centre.y+rim.y+24);side.addColorStop(0,'#8cd2d2');side.addColorStop(1,'#bce9e1');
      ellipse(c,centre.x,centre.y+19,rim.x,rim.y,side);c.strokeStyle='#2a7c85';c.lineWidth=2.3;c.stroke();
      const top=c.createLinearGradient(180,72,790,407);top.addColorStop(0,'#d2f2e8');top.addColorStop(.5,'#b2e6df');top.addColorStop(1,'#9cd8d8');
      ellipse(c,centre.x,centre.y,rim.x,rim.y,top);c.strokeStyle='#246b78';c.lineWidth=2.5;c.stroke();
      const liquid=c.createRadialGradient(410,177,10,500,255,420);liquid.addColorStop(0,'#c1eee2');liquid.addColorStop(.65,'#ace2d9');liquid.addColorStop(1,'#98d5d4');
      ellipse(c,centre.x,centre.y+2,rim.x-16,rim.y-14,liquid);c.strokeStyle='#61b9bd';c.lineWidth=1.4;c.stroke();
      c.beginPath();c.ellipse(centre.x,centre.y,rim.x-6,rim.y-5,0,Math.PI*1.03,Math.PI*1.8);c.strokeStyle='#f5fff0ba';c.lineWidth=4;c.stroke();
      c.beginPath();c.ellipse(centre.x,centre.y+2,rim.x-9,rim.y-9,0,.12,Math.PI*.78);c.strokeStyle='#e2faf189';c.lineWidth=3;c.stroke();
      // Broken reflections, rather than a thick white border, preserve the reference's teal linework.
      c.lineCap='round';
      c.beginPath();c.ellipse(centre.x,centre.y+11,rim.x-2,rim.y,0,.3,.78);c.strokeStyle='#ecfff29e';c.lineWidth=4;c.stroke();
      c.beginPath();c.ellipse(centre.x,centre.y,rim.x-23,rim.y-21,0,3.57,4.23);c.strokeStyle='#fffef158';c.lineWidth=5;c.stroke();
    }
    sync(state) {
      for(const event of state.divisions){
        if(event.progress!==1||this.completed.has(event.parent))continue;
        const parent=this.cells.find(c=>c.id===event.parent);if(!parent)continue;
        this.completed.add(event.parent);
        const distance=parent.radius*(parent.kind==='round'?1.3:1.8),dx=Math.cos(parent.angle)*distance,dy=Math.sin(parent.angle)*distance;
        this.cells=this.cells.filter(c=>c!==parent);
        for(const side of [-1,1])this.cells.push({...parent,id:8+event.parent*2+(side===1?1:0),x:parent.x+dx*side,y:parent.y+dy*side,angle:parent.angle+side*.09,phase:parent.phase+side*.8,heading:parent.angle+(side<0?Math.PI:0),speed:parent.speed*.85});
        if(!this.reduced.matches)this.flashes.push({x:parent.x,y:parent.y,age:0});
      }
      this.state=state;
      this.canvas.dataset.cells=String(this.cells.length);
    }
    move(dt) {
      for(const cell of this.cells){
        cell.heading+=Math.sin(this.time*.49+cell.phase)*dt*.6;
        cell.x+=Math.cos(cell.heading)*cell.speed*dt;cell.y+=Math.sin(cell.heading)*cell.speed*.65*dt;
        const u=(cell.x-centre.x)/343,v=(cell.y-centre.y)/122,edge=Math.hypot(u,v);
        if(edge>1){cell.x=centre.x+(cell.x-centre.x)/edge;cell.y=centre.y+(cell.y-centre.y)/edge;cell.heading=Math.atan2(-v,-u)+(cell.phase%1-.5);}
      }
      // Gentle spacing keeps faces legible; no collisions or locations change the story's divisions.
      for(let i=0;i<this.cells.length;i++)for(let j=i+1;j<this.cells.length;j++){
        const a=this.cells[i],b=this.cells[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,min=(a.radius+b.radius)*1.65;
        if(d<min){const n=(min-d)*Math.min(.16,dt*1.9);a.x-=dx/d*n;a.y-=dy/d*n;b.x+=dx/d*n;b.y+=dy/d*n;}
      }
    }
    render(dt) {
      const still=this.reduced.matches;if(!still){this.time+=dt;this.move(dt);}
      const c=this.c;c.setTransform(this.canvas.width/W,0,0,this.canvas.height/H,0,0);c.clearRect(0,0,W,H);c.drawImage(this.background,0,0,W,H);
      // A few drifting specks suggest a liquid medium. They are scenery, not counted resources.
      const dots=[[187,265,4,2],[326,160,5,2],[530,335,4,1],[701,157,3,0],[801,290,4,2],[365,300,3,0],[559,220,3,2],[218,335,3,1],[628,370,3,0]];
      dots.forEach(([x,y,r,k],i)=>{const sx=still?0:Math.sin(this.time*.4+i)*4,sy=still?0:Math.cos(this.time*.3+i)*3;ellipse(c,x+sx,y+sy,r,r,['#55b6bd55','#ed98745e','#eec76285'][k]);});
      for(const cell of [...this.cells].sort((a,b)=>a.y-b.y)){
        const division=cell.id<8?this.state.divisions.find(d=>d.parent===cell.id).progress:0;
        // Reduced motion shows the unchanging parent until it is replaced by two daughters.
        const p=still?0:division;
        const look={...cell,angle:cell.angle+(still?0:Math.sin(this.time*.75+cell.phase)*.035)};
        window.BacteriumCharacter.draw(c,look,this.time,p,still);
      }
      if(!still){
        this.flashes=this.flashes.filter(f=>f.age<1.1);
        for(const f of this.flashes){f.age+=dt;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.globalAlpha=(1-f.age/1.1)*.6;ellipse(c,f.x+Math.cos(a)*(10+f.age*25),f.y+Math.sin(a)*(10+f.age*17),1.8,1.8,'#fffceb');}c.globalAlpha=1;}
      }
    }
  }
  window.DishScene=DishScene;
})();
