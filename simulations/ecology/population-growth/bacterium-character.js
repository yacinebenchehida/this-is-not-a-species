/* Code-native characters based on the site's Petri Dish illustration. No demographic logic. */
(function () {
  'use strict';
  const ink = '#246c75';
  const colours = [
    {base:'#78c8ce', light:'#bbebdf', shade:'#48aab9', spots:'#2d99a8', cheek:'#eeb3a0'},
    {base:'#ff987b', light:'#ffd2ac', shade:'#eb7b64', spots:'#df715b', cheek:'#f36c61'},
    {base:'#f7d568', light:'#fff0a1', shade:'#eaba48', spots:'#e88b57', cheek:'#f5a07b'}
  ];
  function oval(c,x,y,rx,ry,fill) {c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function outline(c,length,r,pinch,bend) {
    // Two rounded ends joined by a waist. The same silhouette can elongate and constrict.
    const end = length / 2 - r, waist = r * (1 - pinch * .92);
    c.beginPath(); c.moveTo(-end,-r);
    c.bezierCurveTo(-end*.4,-r, -end*.35,-waist+bend,0,-waist+bend);
    c.bezierCurveTo(end*.35,-waist+bend,end*.4,-r,end,-r);
    c.bezierCurveTo(end+r*1.33,-r,end+r*1.33,r,end,r);
    c.bezierCurveTo(end*.4,r,end*.35,waist+bend,0,waist+bend);
    c.bezierCurveTo(-end*.35,waist+bend,-end*.4,r,-end,r);
    c.bezierCurveTo(-end-r*1.33,r,-end-r*1.33,-r,-end,-r); c.closePath();
  }
  // mood 0 happy, 1 peckish (flat mouth), 2 hungry (heavy eyelids, small open mouth). Decorative only.
  function face(c,x,y,scale,time,phase,still,second=false,mood=0) {
    c.save(); c.translate(x,y); c.scale(scale,scale);
    const blink = !still && (time + phase * 3.7) % 5.2 < .13;
    for(const side of [-1,1]) {
      if(blink){c.beginPath();c.moveTo(side*5-1.8,-2);c.quadraticCurveTo(side*5,-.5,side*5+1.8,-2);c.strokeStyle='#174b59';c.lineWidth=1.7;c.stroke();}
      else if(mood===2){oval(c,side*5,-1.4,2.15,1.7,'#174b59');c.beginPath();c.moveTo(side*5-2.6,-2.7);c.lineTo(side*5+2.6,-2.7);c.strokeStyle='#174b59';c.lineWidth=1.5;c.stroke();oval(c,side*5-.6,-1.6,.5,.45,'#fffdf0');}
      else {oval(c,side*5,-2,2.15,2.65,'#174b59');oval(c,side*5-.6,-2.9,.65,.75,'#fffdf0');}
    }
    oval(c,-9,3,3.2,1.4,'#f6ae9a66'); oval(c,9,3,3.2,1.4,'#f6ae9a66');
    if(mood===2){oval(c,0,5.2,2.1,2.5,'#2d6870');}
    else if(mood===1){c.beginPath();c.moveTo(-2.8,4.9);c.lineTo(2.8,4.9);c.strokeStyle='#2d6870';c.lineWidth=1.6;c.lineCap='round';c.stroke();}
    else {c.beginPath();c.moveTo(-2.3,4);c.quadraticCurveTo(0,second?6.7:6,2.3,4);c.strokeStyle='#2d6870';c.lineWidth=1.05;c.stroke();}
    c.restore();
  }
  function draw(c,cell,time,division=0,still=false) {
    const p=colours[cell.colour], r=cell.radius, long=cell.kind==='round'?r*2.15:cell.kind==='bean'?r*3.25:r*3.65;
    const growth=division<.65?division/.65:1, pinch=Math.max(0,(division-.57)/.43);
    const length=long*(1+growth*.9), bend=cell.kind==='bean'?r*.17:0;
    c.save();c.translate(cell.x,cell.y);c.rotate(cell.angle);
    // Short, soft surface hairs distinguish the round character without a viral crown.
    if(cell.kind==='round') {
      c.strokeStyle=ink;c.lineWidth=2.3;c.lineCap='round';
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7+.1;const x=Math.cos(a)*r*1.03,y=Math.sin(a)*r;const wiggle=still?0:Math.sin(time*1.5+cell.phase+i)*1.1;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a)*6,y+Math.sin(a)*6,x+Math.cos(a)*8+wiggle,y+Math.sin(a)*8);c.stroke();}
    }
    c.shadowColor='#237f8926';c.shadowBlur=7;c.shadowOffsetY=5;
    outline(c,length,r,pinch,bend);
    const wash=c.createLinearGradient(-length*.2,-r,length*.15,r*1.4);
    wash.addColorStop(0,p.light);wash.addColorStop(.4,p.base);wash.addColorStop(1,p.shade);
    c.fillStyle=wash;c.fill();c.shadowColor='transparent';c.strokeStyle=ink;c.lineWidth=2.4;c.lineJoin='round';c.stroke();
    c.save();outline(c,length,r,pinch,bend);c.clip();
    // Broad reflected light adds volume while leaving the simple outline readable.
    const glow=c.createRadialGradient(-length*.18,-r*.5,1,-length*.18,-r*.5,r*1.5);glow.addColorStop(0,'#fffce83d');glow.addColorStop(1,'#fffce800');
    oval(c,-length*.18,-r*.5,r*2,r*1.4,glow);
    const spread=(length/long), spots=cell.kind==='round'?[[-7,9,3],[8,9,4]]:[[-long*.28,2,5],[-long*.11,7,4],[long*.08,6,3.5]];
    for(const [x,y,s] of spots)oval(c,x*spread,y,s,s*.93,p.spots+'b5');
    c.beginPath();c.moveTo(-length*.36,-r*.55);c.quadraticCurveTo(-length*.22,-r*.78,-length*.08,-r*.68);c.strokeStyle='#fffef063';c.lineWidth=2.6;c.lineCap='round';c.stroke();
    // Hungrier cells look paler, a cue that stays visible when cells are drawn small.
    if(cell.mood){outline(c,length,r,pinch,bend);c.fillStyle=cell.mood===2?'#f1efe4a6':'#f1efe44d';c.fill();}
    c.restore();
    // A second face appears only as two daughter compartments form.
    const faceX=cell.kind==='round'?0:long*.24;
    const shift=growth*r*(cell.kind==='round'?1.3:1.8);
    face(c,faceX+shift,-r*.13,1,time,cell.phase,still,false,cell.mood||0);
    if(division>.68){c.save();c.globalAlpha=Math.min(1,(division-.68)/.2);face(c,faceX-shift,-r*.12,.9,time,cell.phase+1,still,true,cell.mood||0);c.restore();}
    c.restore();
  }
  window.BacteriumCharacter={draw,colours};
})();
