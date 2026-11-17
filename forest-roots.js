/* Small, unlabeled memories tangled into the roots. */
(() => {
'use strict';
const world=document.getElementById('world');
const memories=[
 {id:'chip',label:'a tiny circuit',side:.16,depth:310,angle:-.12},
 {id:'hockey',label:'a hockey stick and puck',side:-.18,depth:650,angle:.12},
 {id:'flight',label:'a paper plane',side:.10,depth:1020,angle:-.22}
].map(m=>({...m,found:false,reveal:0,pulse:1}));
const clamp=v=>Math.max(0,Math.min(1,v));
let quiet=false;
function point(m,width){return {x:m.side*Math.min(width,1250),y:m.depth}}
function rootPath(p){
 return Array.from({length:65},(_,i)=>{
  const t=i/64,u=1-t;
  return {x:3*u*t*t*p.x*.9+t*t*t*p.x+Math.sin(t*Math.PI)*Math.sin(t*8)*9,
   y:p.y*t};
 });
}
function stroke(c,paths,progress,alpha,width=1.25){
 c.globalAlpha=alpha;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();
 for(const points of paths){
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
  let remaining=length*clamp(progress);c.moveTo(...points[0]);
  for(let i=1;i<points.length&&remaining>0;i++){
   const a=points[i-1],b=points[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]),f=Math.min(1,remaining/(d||1));
   c.lineTo(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);remaining-=d;
  }
 }
 c.stroke();c.globalAlpha=1;
}
function circle(x,y,rx,ry=rx){return Array.from({length:33},(_,i)=>[x+Math.cos(i/32*Math.PI*2)*rx,y+Math.sin(i/32*Math.PI*2)*ry])}
const shapes={
 chip:[ [[-23,-23],[23,-23],[23,23],[-23,23],[-23,-23]], [[-11,-10],[10,-10],[10,11],[-11,11],[-11,-10]],
  [[-5,-10],[-5,-3],[10,-3]], [[-11,4],[1,4],[1,11]], ...[-15,-5,5,15].flatMap(v=>[
   [[v,-23],[v,-35]],[[v,23],[v,35]],[[-23,v],[-35,v]],[[23,v],[35,v]]
  ]) ],
 hockey:[ [[-19,-39],[9,24],[35,27],[38,34],[8,34],[3,29],[-24,-37]],
  [[-23,-32],[-17,-34]],[[-21,-27],[-15,-29]],[[-19,-22],[-13,-24]],
  circle(-19,27,11,4),[[-30,27],[-30,32],[-19,36],[-8,32],[-8,27]] ],
 flight:[ [[-37,-14],[38,-29],[9,37],[-4,10],[-37,-14]], [[-4,10],[38,-29],[-12,1],[-10,22],[2,16]],
  [[-42,17],[-51,23]],[[-32,31],[-43,40]] ]
};
function discover(m){
 m.found=true;m.pulse=quiet?1:0;if(quiet)m.reveal=1;
 m.button.setAttribute('aria-label','Replay the root memory: '+m.label);
 window.forestScene?.wake();
}
for(const m of memories){
 const button=document.createElement('button');button.type='button';button.className='root-memory';
 button.setAttribute('aria-label','Uncover a root memory: '+m.label);
 button.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')discover(m)});
 button.addEventListener('focus',()=>discover(m));
 button.addEventListener('click',()=>discover(m));
 world.append(button);m.button=button;
}
function layout({width,camera,ground,origin}){
 for(const m of memories){
  const p=point(m,width);
  m.button.style.left=(camera.x+p.x+origin.left)+'px';
  m.button.style.top=(ground+p.y+origin.top)+'px';
 }
}
function tick(dt,paused){
 quiet=paused;
 for(const m of memories)if(m.found){
  m.reveal=paused?1:Math.min(1,m.reveal+dt*.95);
  m.pulse=paused?1:Math.min(1,m.pulse+dt*.4);
 }
}
function draw(c,{width,height,camera,ground,scroll,clock,paused}){
 quiet=paused;c.save();c.translate(camera.x,ground-scroll);
 c.strokeStyle='#b8bbc3';c.fillStyle='#d9dce5';
 for(const m of memories){
  const p=point(m,width),path=rootPath(p),y=ground+p.y-scroll;
  if(ground-scroll>height||y < -90)continue;
  stroke(c,[path.map(q=>[q.x,q.y])],1,m.found?.2:.12,.85);
  // The traveling speck runs up the same root that holds the memory.
  if(m.pulse<1&&!paused){
   for(let trail=0;trail<5;trail++){
    const t=clamp(1-m.pulse+trail*.014),index=Math.min(63,Math.floor(t*64)),f=t*64-index;
    const a=path[index],b=path[index+1],x=a.x+(b.x-a.x)*f,yy=a.y+(b.y-a.y)*f;
    c.globalAlpha=(1-trail/5)*Math.sin(Math.PI*m.pulse)*.9;
    c.beginPath();c.arc(x,yy,trail?1:2.4,0,Math.PI*2);c.fill();
   }
  }
  if(y>height+90)continue;
  c.save();c.translate(p.x,p.y);c.rotate(m.angle);
  // Ragged little knots are the only invitation; no captions, tooltips, or cards.
  const breath=paused?1:.88+Math.sin(clock*1.6+m.depth)*.12;
  c.globalAlpha=(m.found?.2:.65)*breath;c.beginPath();c.ellipse(0,0,4,6,.5,0,Math.PI*2);c.fill();
  stroke(c,[[[-10,-8],[-4,-3],[0,6],[8,10]],[[8,-10],[3,-4],[0,6],[-5,13]]],1,m.found?.16:.38,.8);
  if(m.reveal>0){
   // Clear just a soft pocket in the soil so the fine drawing remains legible.
   const haze=c.createRadialGradient(0,0,8,0,0,57);haze.addColorStop(0,'rgba(42,40,44,.86)');haze.addColorStop(1,'rgba(42,40,44,0)');
   c.globalAlpha=m.reveal;c.fillStyle=haze;c.fillRect(-60,-60,120,120);c.fillStyle='#d9dce5';
   stroke(c,shapes[m.id],m.reveal,.72,1.35);
   // Small irregular root hairs stop the etching feeling like a UI icon.
   stroke(c,[[[-23,23],[-31,35],[-29,42]],[[23,-23],[30,-35],[37,-39]]],m.reveal,.22,.7);
  }
  c.restore();
 }
 c.restore();
}
window.forestRoots={layout,tick,draw,
 get moving(){return memories.some(m=>m.found&&(m.reveal<1||m.pulse<1))},
 get state(){return memories.map(({id,found,reveal,pulse})=>({id,found,reveal,pulse}))}
};
})();
