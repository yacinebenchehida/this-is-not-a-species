/* Exact growth trajectories and deterministic division events. See MODEL.md. */
(function(root){
  'use strict';
  function validate(n0,r,K){
    if(!Number.isInteger(n0)||n0<1||!Number.isFinite(r)||r<0||!(K===Infinity||Number.isFinite(K)&&K>=n0))throw new RangeError('Invalid population settings.');
  }
  function population(t,n0,r,K=Infinity){
    validate(n0,r,K);if(!Number.isFinite(t)||t<0)throw new RangeError('Time must be finite and nonnegative.');
    if(r===0||K===n0)return n0;
    return K===Infinity?n0*Math.exp(r*t):K/(1+(K/n0-1)*Math.exp(-r*t));
  }
  function crossing(n,n0,r,K=Infinity){
    validate(n0,r,K);if(n<=n0)return 0;if(r===0||n>=K)return Infinity;
    return K===Infinity?Math.log(n/n0)/r:Math.log(n*(K-n0)/(n0*(K-n)))/r;
  }
  function schedule(n0,r,K=Infinity,limit=512){
    validate(n0,r,K);if(!Number.isInteger(limit)||limit<n0)throw new RangeError('Invalid display limit.');
    const cells=Array.from({length:n0},(_,id)=>({id,born:0,divide:Infinity})),queue=cells.slice(),events=[];let head=0;
    for(let n=n0+1;n<=limit;n++){
      const time=crossing(n,n0,r,K);if(!Number.isFinite(time))break;
      const parent=queue[head++];parent.divide=time;
      const daughters=[0,1].map(()=>{const cell={id:cells.length,born:time,divide:Infinity};cells.push(cell);queue.push(cell);return cell.id;});
      events.push({time,parent:parent.id,daughters});
    }
    return {n0,r,K,limit,cells,events};
  }
  function completed(schedule,time){let low=0,high=schedule.events.length;while(low<high){const mid=(low+high)>>1;if(schedule.events[mid].time<=time+1e-10)low=mid+1;else high=mid;}return low;}
  function remaining(t,n0,r,K){return Math.max(0,Math.min(1,(K-population(t,n0,r,K))/(K-n0||1)));}
  const api={population,crossing,schedule,completed,remaining};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GrowthModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
