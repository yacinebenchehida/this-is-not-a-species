/* Exact growth trajectories and deterministic division events. See MODEL.md. */
(function(root){
  'use strict';
  function validate(n0,r,K){
    if(!Number.isFinite(n0)||n0<=0||!Number.isFinite(r)||r<0||!(K===Infinity||Number.isFinite(K)&&K>=n0))throw new RangeError('Invalid population settings.');
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
  function schedule(n0,r,K=Infinity,limit=1024){
    validate(n0,r,K);if(!Number.isInteger(n0)||!Number.isInteger(limit)||limit<n0)throw new RangeError('Invalid display limit.');
    const cells=Array.from({length:n0},(_,id)=>({id,born:0,divide:Infinity})),queue=cells.slice(),events=[];let head=0;
    for(let n=n0+1;n<=limit;n++){
      const time=crossing(n,n0,r,K);if(!Number.isFinite(time))break;
      const parent=queue[head++];parent.divide=time;
      const daughters=[0,1].map(()=>{const cell={id:cells.length,born:time,divide:Infinity};cells.push(cell);queue.push(cell);return cell.id;});
      events.push({time,parent:parent.id,daughters});
    }
    return {n0,r,K,limit,cells,events,segments:[{time:0,n:n0,K}]};
  }
  function completed(schedule,time){let low=0,high=schedule.events.length;while(low<high){const mid=(low+high)>>1;if(schedule.events[mid].time<=time+1e-10)low=mid+1;else high=mid;}return low;}
  function remaining(t,n0,r,K){return Math.max(0,Math.min(1,(K-population(t,n0,r,K))/(K-n0||1)));}
  function segmentAt(s,t){if(!Number.isFinite(t)||t<0)throw new RangeError('Invalid observation time.');return s.segments.filter(x=>x.time<=t).at(-1)||s.segments[0];}
  function value(s,t){const segment=segmentAt(s,t);return population(t-segment.time,segment.n,s.r,segment.K);}
  function nutrients(s,t){const K=segmentAt(s,t).K;return K===Infinity?Infinity:Math.max(0,K-value(s,t));}
  function feed(s,t,amount){
    if(s.K===Infinity||!Number.isFinite(t)||t<0||!Number.isFinite(amount)||amount<=0||t<s.segments.at(-1).time)throw new RangeError('Invalid nutrient addition.');
    const n=value(s,t),K=s.K+amount,past=s.events.slice(0,completed(s,t)),alive=new Set(Array.from({length:s.n0},(_,i)=>i));
    if(n>=s.limit)throw new RangeError('The viewing limit has been reached.');
    for(const e of past){alive.delete(e.parent);e.daughters.forEach(id=>alive.add(id));}
    const nextId=past.length?s.n0+2*past.length:s.n0,cells=s.cells.slice(0,nextId).map(c=>({...c})),queue=Array.from(alive,id=>cells[id]);let head=0;
    for(const c of queue)c.divide=Infinity;
    const events=past.slice();
    for(let target=alive.size+1;target<=s.limit;target++){
      const at=t+crossing(target,n,s.r,K);if(!Number.isFinite(at))break;
      const parent=queue[head++];parent.divide=at;
      const daughters=[0,1].map(()=>{const c={id:cells.length,born:at,divide:Infinity};cells.push(c);queue.push(c);return c.id;});events.push({time:at,parent:parent.id,daughters});
    }
    return {...s,K,cells,events,segments:[...s.segments,{time:t,n,K}]};
  }
  const api={population,crossing,schedule,completed,remaining,value,nutrients,feed};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GrowthModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
