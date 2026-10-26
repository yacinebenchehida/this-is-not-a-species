/* Static chapter illustrations only. No animation loop, controls, population model or event sampling. */
(function(){
  'use strict';
  const Character=window.BacteriumCharacter,Dish=window.DishScene;
  if(!Character||!Dish)return;
  function cube(c,x,y,s=10){
    c.save();c.translate(x,y);c.rotate(.1);c.lineJoin='round';
    c.beginPath();c.moveTo(-s,-s*.6);c.lineTo(-s*.6,-s);c.lineTo(s,-s);c.lineTo(s,s*.6);c.lineTo(s*.6,s);c.lineTo(-s,s);c.closePath();c.fillStyle='#fffdf4';c.fill();c.strokeStyle='#ac9d7a';c.lineWidth=1.3;c.stroke();
    c.beginPath();c.moveTo(-s,-s*.6);c.lineTo(s*.6,-s*.6);c.lineTo(s,-s);c.moveTo(s*.6,-s*.6);c.lineTo(s*.6,s);c.strokeStyle='#c7bea6';c.stroke();c.restore();
  }
  for(const canvas of document.querySelectorAll('canvas[data-series-dish]')){
    const c=canvas.getContext('2d');if(!c)continue;c.scale(canvas.width/1000,canvas.height/520);Dish.prototype.paintDish(c);
    const kind=canvas.dataset.seriesDish;
    const seats=[[285,190,-.35,0,'rod'],[490,160,.18,1,'round'],[720,205,.4,2,'bean'],[365,295,-.45,2,'bean'],[585,310,.25,0,'rod'],[710,305,-.22,1,'round']];
    const food=kind==='growth-curve'?[[385,215],[600,235]]:[[210,280],[370,140],[450,230],[570,210],[650,135],[785,260],[485,320],[300,245],[680,360]];
    for(const [x,y] of food)cube(c,x,y,10);
    for(let i=0;i<seats.length;i++){
      const [x,y,angle,colour,shape]=seats[i],faded=(kind==='births-deaths'||kind==='growth-curve')&&i===5;
      c.save();c.globalAlpha=faded?.23:1;Character.draw(c,{x,y,angle,colour,kind:shape,radius:23,phase:i,faceScale:1.35,mood:kind==='growth-curve'?1:0},0,kind==='births-deaths'&&i===0?.87:0,true);c.restore();
    }
    if(kind==='growth-rate'){
      // A still trail of arriving cubes represents a renewed supply, not a changing reserve.
      for(const [x,y,s] of [[500,35,9],[500,65,10],[500,98,11]])cube(c,x,y,s);
      c.beginPath();c.moveTo(500,112);c.lineTo(500,134);c.lineTo(494,126);c.moveTo(500,134);c.lineTo(506,126);c.strokeStyle='#8d9e73';c.lineWidth=2;c.stroke();
    }
  }
})();
