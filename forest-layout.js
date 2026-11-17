/* Incremental, stochastic placement in one shared world. */
(() => {
'use strict';
const mix=(a,b,t)=>a+(b-a)*t;
const inside=(p,r,pad=0)=>p.x>r.x-pad&&p.x<r.x+r.w+pad&&p.y>r.y-pad&&p.y<r.y+r.h+pad;
const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
function cubic(a,b,c,d,t){const u=1-t;return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y}}
window.createForestLayout=({random=Math.random}={})=>{
 const branches=new Map(),stories=new Map();
 const rand=(a,b)=>a+(b-a)*random();
 function samples(point,n=65){return Array.from({length:n},(_,i)=>point(i/(n-1)))}
 function branchScore(p){
  let score=0;
  for(const other of branches.values()){
   for(const node of p.nodes)for(const old of other.nodes)if(overlap(node.box,old.box,18))score+=200;
   for(let i=14;i<p.points.length;i+=3)for(let j=14;j<other.points.length;j+=3){
    const d=Math.hypot(p.points[i].x-other.points[j].x,p.points[i].y-other.points[j].y);
    if(d<75)score+=(75-d)*2;
   }
  }
  for(const s of stories.values()){
   for(const q of p.points)if(inside(q,s.rect,65))score+=500;
   for(const n of p.nodes)if(overlap(n.box,s.rect,45))score+=1000;
  }
  return score;
 }
 function openBranch(spec){
  if(branches.has(spec.key))return branches.get(spec.key);
  const {base,label,count,width,height,side,down}=spec,mobile=width<700;
  let best=null,bestScore=Infinity;
  for(let attempt=0;attempt<65;attempt++){
   const angle=Math.atan2(down*(mobile?1:.63),side*(mobile?.38:1))+rand(-.25,.25);
   const length=Math.max(count*(mobile?96:116),width*.58)*rand(.92,1.14)*(1+Math.floor(attempt/25)*.13);
   const end={x:label.x+Math.cos(angle)*length,y:label.y+Math.sin(angle)*length};
   const bend=rand(-.22,.22)*length;
   const c1={x:label.x+Math.cos(angle)*length*.31-Math.sin(angle)*bend,y:label.y+Math.sin(angle)*length*.31+Math.cos(angle)*bend};
   const c2={x:label.x+Math.cos(angle)*length*.73+Math.sin(angle)*bend*.6,y:label.y+Math.sin(angle)*length*.73-Math.cos(angle)*bend*.6};
   const seed=rand(0,1000),thickness=rand(7.5,12.5),foliage=rand(23,34);
   const point=t=>{
    if(t<.18){const f=t/.18;return {x:mix(base.x,label.x,f),y:mix(base.y,label.y,f)+Math.sin(f*Math.PI)*5}}
    const f=(t-.18)/.82,p=cubic(label,c1,c2,end,f),wave=Math.sin(Math.PI*f);
    p.x+=wave*Math.sin(f*13+seed)*randless(seed,4);p.y+=wave*Math.sin(f*17+seed)*7;return p;
   };
   const nodes=[];
   for(let i=0;i<count;i++){
    const t=.29+(i+.35)/Math.max(1,count)*.66,p=point(t),next=point(Math.min(1,t+.01)),dx=next.x-p.x,dy=next.y-p.y,d=Math.hypot(dx,dy)||1;
    let nx=-dy/d,ny=dx/d;const sign=i%2===0?-1:1;if(Math.sign(ny)!==sign){nx=-nx;ny=-ny}
    const startOffset=rand(mobile?43:52,mobile?60:78),w=mobile?150:202,h=mobile?58:48;
    let x,y,box;
    for(let step=0;step<30;step++){
     const offset=startOffset+step*24;x=p.x+nx*offset;y=p.y+ny*offset;box={x:x-w/2,y:y-h/2,w,h};
     if(nodes.every(n=>!overlap(box,n.box,14)))break;
    }
    nodes.push({x,y,t,branch:p,direction:{x:nx,y:ny},box});
   }
   const p={...spec,point,points:samples(point),nodes,seed,thickness,foliage};
   const score=branchScore(p);if(score<bestScore){best=p;bestScore=score}if(score===0)break;
  }
  branches.set(spec.key,best);return best;
 }
 function randless(seed,range){return (Math.sin(seed*7.13)*.5+.5)*range}
 function fits(rect,key){
  for(const [id,s] of stories)if(id!==key&&overlap(rect,s.rect,90))return false;
  for(const b of branches.values()){
   for(const n of b.nodes)if(overlap(rect,n.box,45))return false;
   for(let i=10;i<b.points.length;i+=2)if(inside(b.points[i],rect,55))return false;
  }
  return true;
 }
 function placeStory({key,group,item,width,height}){
  const previous=stories.get(key);
  if(previous&&Math.abs(previous.rect.w-width)<2&&Math.abs(previous.rect.h-height)<2)return previous;
  const b=branches.get(group);if(!b)return null;
  const node=b.nodes[item]||{x:b.label.x,y:b.label.y,branch:b.base,direction:{x:b.side*.65,y:b.down}};
  const dir=node.direction;
  const start=node.branch,tip={x:node.x,y:node.y};
  let rect=null;
  // Search outward from the clicked label, preserving its above/below direction.
  for(let attempt=0;attempt<180;attempt++){
   const ring=Math.floor(attempt/12),reach=180+ring*150+rand(0,90);
   const center=tip.x+dir.x*reach+rand(-80,80)*(1+ring*.2);
   const candidate={x:center-width/2,y:dir.y<0?tip.y-reach-height:tip.y+reach,w:width,h:height};
   if(fits(candidate,key)){rect=candidate;break}
  }
  // Unlimited world: a distant free lane is preferable to covering existing text.
  if(!rect){
   let y=dir.y<0?tip.y-height-600:tip.y+600;
   const x=tip.x+dir.x*700-width/2;
   rect={x,y,w:width,h:height};
   while(!fits(rect,key))rect.y+=Math.sign(dir.y||1)*(height+180);
  }
  const side=dir.x<0?-1:1;
  const entry={x:side>0?rect.x-18:rect.x+rect.w+18,y:rect.y+12};
  let point,points,bestScore=Infinity;
  for(let attempt=0;attempt<35;attempt++){
   const lead=rand(100,260),clearance=rand(60,420);
   const c1={x:tip.x+dir.x*lead,y:tip.y+dir.y*lead};
   const c2={x:entry.x-side*clearance,y:tip.y+dir.y*Math.min(700,Math.abs(entry.y-tip.y)*rand(.35,.75))};
   const candidate=t=>cubic(start,c1,c2,entry,t),path=samples(candidate);
   let score=0;
   for(const [id,old] of stories)if(id!==key)for(const q of path)if(inside(q,old.rect,35))score+=1000;
   for(const other of branches.values())for(let i=16;i<path.length;i+=4)for(let j=10;j<other.points.length;j+=4)
    if(Math.hypot(path[i].x-other.points[j].x,path[i].y-other.points[j].y)<30)score+=50;
   if(score<bestScore){point=candidate;points=path;bestScore=score}if(!score)break;
  }
  const result={key,group,item,rect,point,points,seed:previous?.seed??rand(0,1000),thickness:rand(2.3,4.3),foliage:rand(9,15)};
  stories.set(key,result);return result;
 }
 return {branches,stories,openBranch,placeStory,resetStories(){stories.clear()},reset(){branches.clear();stories.clear()}};
};
})();
