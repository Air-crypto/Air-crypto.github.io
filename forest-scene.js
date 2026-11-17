/* Procedural ink scenery, independently drawn for Arihan's portfolio. */
(() => {
'use strict';
const viewport=document.getElementById('forest-viewport');
const canvas=document.getElementById('landscape');
const ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motion=document.getElementById('motion-toggle');
const INK='#b8bbc3',BG='#2a282c';
let W=0,H=0,DPR=1,scroll=0,panX=0,clock=0,last=0,frame=0,paused=reduced.matches;
let view={type:'home',group:'',item:-1},current={x:0,y:0},target={x:0,y:0},initialized=false;
const branches=new Map(['work','projects','life','me'].map(key=>[key,{key,open:false,growth:0,count:0}]));
let layoutCallback=()=>{},connector=0,resetting=false;
const planner=window.createForestLayout(),storyGrowth=new Map();
const scenerySeed=Math.floor(Math.random()*4294967295);
const labelAnchors=new Map();
let scrollOrigin={left:0,top:0},zoom=1;
let rng=2943;
function random(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296}
const r=(a,b)=>a+(b-a)*random();
function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function line(c,points,width=1,alpha=1){c.strokeStyle=INK;c.globalAlpha=alpha;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.stroke();c.globalAlpha=1}
function roughBlob(c,x,y,rx,ry,rotation=0){
 c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=INK;c.beginPath();
 const noise=Array.from({length:32},()=>r(.82,1.17));
 for(let i=0;i<=128;i++){const angle=i/128*Math.PI*2,n=noise[Math.floor(i/4)%32],rad=n*r(.94,1.05),px=Math.cos(angle)*rx*rad,py=Math.sin(angle)*ry*rad;if(i===0)c.moveTo(px,py);else c.lineTo(px,py)}
 c.closePath();c.fill();
 for(let i=0;i<rx*ry*.09;i++){const a=r(0,6.28),s=r(.78,1.2);c.fillRect(Math.cos(a)*rx*s,Math.sin(a)*ry*s,r(.5,2.4),r(.5,2.4))}
 c.restore();
}
const treeArt=surface(600,1050),tc=treeArt.getContext('2d');
rng=scenerySeed;
// A narrow, asymmetric canopy with open pockets and ragged, stippled edges.
const spine=[[300,1030],[299,905],[305,790],[300,680],[294,570],[305,450],[295,330],[303,205],[289,90]];
// A broad root flare narrows into an uneven, gently curved trunk.
const trunkPhase=r(-.5,.5),trunkPoints=Array.from({length:110},(_,i)=>{
 const t=i/109;return [300+Math.sin(t*4+trunkPhase)*7+Math.sin(t*8)*2,1035-t*945];
});
for(let i=1;i<trunkPoints.length;i++)line(tc,[trunkPoints[i-1],trunkPoints[i]],Math.max(2,23*Math.pow(1-i/110,.9)),.95);
for(let i=0;i<8;i++)line(tc,[[300+r(-5,5),995],[300+r(-12,12),1030],[300+r(-31,31),1048]],r(1.2,4),.75);
// Foliage follows a branching skeleton instead of stacked horizontal blobs.
const leafSites=[];
function crownBranch(x,y,length,angle,thickness,depth){
 const points=[[x,y]],bend=r(-.4,.4),steps=22;
 angle=Math.max(-2.8,Math.min(-.34,angle));
 for(let i=1;i<=steps;i++){
  const t=i/steps,a=angle+Math.sin(t*Math.PI)*bend;
  x+=Math.cos(a)*length/steps;y+=Math.sin(a)*length/steps;
  x=Math.max(65,Math.min(535,x));y=Math.max(45,y);points.push([x,y]);
  line(tc,[points[i-1],points[i]],Math.max(.5,thickness*(1-t*.6)),.9);
  if(depth<=2&&i>8&&i%5===0)leafSites.push({x:x+r(-9,9),y:y+r(-9,9),angle:a,size:r(9,20)});
 }
 if(depth>0){
  crownBranch(x,y,length*r(.5,.7),angle+r(-.5,-.13),thickness*.58,depth-1);
  crownBranch(x,y,length*r(.46,.67),angle+r(.15,.55),thickness*.53,depth-1);
 }else leafSites.push({x,y,angle,size:r(11,23)});
}
for(let i=0;i<12;i++){
 const y=760-i*48+r(-31,31),side=i%2?1:-1;
 const angle=side>0?r(-1.18,-.55):r(-2.60,-1.97);
 crownBranch(300+Math.sin((1035-y)/945*4+trunkPhase)*7,y,r(92,150)*(1-i*.025),angle,r(3.2,6.1)*(1-i*.025),2);
}
crownBranch(298,230,100,-Math.PI/2,3,2);
// Several smaller, differently angled clusters give the crown depth and open sky.
for(let i=0;i<27;i++)leafSites.push({x:300+r(-82,85),y:r(155,600),angle:r(-2.8,-.3),size:r(8,17)});
leafSites.sort((a,b)=>a.y-b.y);
for(const leaf of leafSites){
 tc.globalAlpha=r(.55,.95);
 roughBlob(tc,leaf.x,leaf.y,leaf.size*r(.65,1.1),leaf.size*r(.75,1.3),leaf.angle+r(-.6,.6));
 for(let i=0;i<3;i++)roughBlob(tc,leaf.x+r(-18,18),leaf.y+r(-16,16),r(3,8),r(4,10),r(-2,2));
}
tc.globalAlpha=1;
// Navigation twigs are drawn live so they can thicken into new limbs.
tc.globalCompositeOperation='source-atop';
for(let i=0;i<69000;i++){tc.globalAlpha=r(.08,.7);tc.fillStyle=BG;tc.fillRect(r(130,420),r(40,1030),r(.4,1.7),r(.4,1.5))}
tc.globalAlpha=1;tc.globalCompositeOperation='source-over';
const brush=surface(140,120),bc=brush.getContext('2d');roughBlob(bc,70,60,51,40,-.1);
bc.globalCompositeOperation='source-atop';for(let i=0;i<4800;i++){bc.globalAlpha=r(.15,.7);bc.fillStyle=BG;bc.fillRect(r(0,140),r(0,120),r(.4,1.2),r(.4,1.5))}bc.globalAlpha=1;
const ground=surface(1,1);
const rootArt=surface(1800,2600),rc=rootArt.getContext('2d');
rng=scenerySeed^44271;
function root(x,y,len,angle,thick,depth,initial=angle){
 angle=Math.max(.22,Math.min(Math.PI-.22,angle));
 if(depth<4)angle+=(Math.PI/2-angle)*.12;
 const turn=r(-.32,.32),points=[[x,y]],steps=14;
 for(let i=1;i<=steps;i++){
  const t=i/steps,a=initial+(angle-initial)*(t*t*(3-2*t))+Math.sin(t*Math.PI)*turn+Math.sin(t*6)*.07;
  x+=Math.cos(a)*len/steps;y+=Math.sin(a)*len/steps;points.push([x,y]);
  line(rc,[points[i-1],points[i]],Math.max(.18,thick*(1-t*.45)),Math.min(.84,.3+thick*.12));
 }
 const mid=points[7],end=points[steps];
 if(depth>0){
  root(end[0],end[1],len*r(.57,.76),angle+turn+r(-.32,.32),thick*r(.54,.72),depth-1,angle+Math.sin(6)*.07);
  if(random()>.13)root(mid[0],mid[1],len*r(.35,.65),angle+r(-.85,.85),thick*r(.32,.52),depth-1,initial+(angle-initial)*.5+turn);
 }
}
for(let i=0;i<9;i++)root(900+r(-13,13),0,r(270,470),r(.35,2.79),r(9,22),7);
const rocks=Array.from({length:5},(_,i)=>{const c=surface(100,80),g=c.getContext('2d');roughBlob(g,50,40,35+r(-8,8),22+r(-5,6),r(-.4,.4));g.globalCompositeOperation='source-atop';for(let j=0;j<2400;j++){g.globalAlpha=r(.2,.8);g.fillStyle=BG;g.fillRect(r(0,100),r(0,80),r(.3,1),r(.3,1))}g.globalAlpha=1;line(g,[[45,28],[41,37],[44,51]],.8,.5);return c});
const grain=surface(256,256),gc=grain.getContext('2d');
for(let i=0;i<6000;i++){gc.fillStyle=random()>.5?'rgba(255,255,255,.022)':'rgba(0,0,0,.04)';gc.fillRect(random()*256,random()*256,1,1)}
let pattern;
let textAreas=[];
const textFade=surface(256,128),fc=textFade.getContext('2d');
fc.scale(1,.5);
const fade=fc.createRadialGradient(128,128,0,128,128,128);
fade.addColorStop(0,'rgba(42,40,44,.92)');
fade.addColorStop(.6,'rgba(42,40,44,.86)');
fade.addColorStop(1,'rgba(42,40,44,0)');
fc.fillStyle=fade;fc.fillRect(0,0,256,256);
function drawGroundArt(){
 ground.width=Math.ceil(W*DPR);ground.height=Math.ceil(235*DPR);
 const g=ground.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);
 rng=scenerySeed^47213;const bottom=136;
 for(let i=0;i<W*1.5;i++){
  const x=random()*W,tall=r(3,24)*(1+Math.pow(Math.sin(x*.014),7)*.9)*(x>W*.67?.45:1),bend=r(-11,11);
  line(g,[[x,bottom+r(-3,5)],[x+bend*.35,bottom-tall*.5],[x+bend,bottom-tall]],r(.45,1.25),r(.35,.9));
 }
 for(let i=0;i<Math.max(13,W/38);i++){
  const x=r(5,W*.64),tall=r(25,74),bend=r(-18,18);
  line(g,[[x,bottom],[x+bend*.25,bottom-tall*.5],[x+bend,bottom-tall]],r(.6,1.1),.95);
  for(let n=0;n<r(2,8);n++){
   const y=bottom-tall+r(0,tall*.5),xx=x+bend*(bottom-y)/tall,side=n%2?1:-1;
   line(g,[[xx,y],[xx+side*5,y-7]],.6);
   roughBlob(g,xx+side*5,y-7,r(1.2,2.6),r(2,4.5),side*.3);
  }
  if(i%3===0)roughBlob(g,x+bend,bottom-tall,4.5,4,0);
 }
 for(let i=0;i<W*5;i++){const depth=Math.pow(random(),2)*90;g.fillStyle=INK;g.globalAlpha=r(.05,.5)*(1-depth/100);g.fillRect(r(0,W),bottom+depth-8,r(.4,1.6),r(.4,1.6))}
 g.globalAlpha=1;
}
// All coordinates belong to one tree. Only the camera and branch growth change.
const anchorSpecs={work:[110,241,-1],projects:[490,323,1],life:[95,477,-1],me:[490,565,1]};
const baseSpecs={work:[297,265],projects:[302,345],life:[299,487],me:[304,590]};
function treeSize(){const sy=H*.95/990;return {sy,sx:W<700?Math.min(sy,W*1.15/600):sy*2.8}}
function rawPoint(x,y){const {sx,sy}=treeSize();return {x:(x-300)*sx,y:H-4-(1050-y)*sy}}
function anchor(key){const [x,y,side]=anchorSpecs[key],p=rawPoint(x,y);if(W<700)p.x=Math.max(-W*.23,Math.min(W*.23,p.x));return {...p,side}}
function baseAnchor(key){return rawPoint(...baseSpecs[key])}
function project(p){return {...p,x:p.x+current.x,y:p.y+current.y}}
function ensureBranch(key,count){
 return planner.openBranch({key,base:baseAnchor(key),label:anchor(key),count,width:W,height:H,side:anchorSpecs[key][2],down:key==='life'||key==='me'?1:-1});
}
function curve(key,t){return planner.branches.get(key)?.point(t)||baseAnchor(key)}
function nodeGeometry(key,i,count){
 const n=planner.branches.get(key)?.nodes[i];
 if(!n)return {x:0,y:0,t:1,opacity:0,side:1};
 return {...project(n.branch),label:project(n),t:n.t,side:n.direction.x<0?-1:1,opacity:Math.max(0,Math.min(1,(branches.get(key).growth-n.t)*12))};
}
function primaryGeometry(key){return project(anchor(key))}
function storyGeometry(key=view.key){const p=planner.stories.get(key);return p?project(p.rect):{x:W*.35,y:H*.3}}
function placeStory(key,group,item,width,height){
 const previous=planner.stories.get(key),p=planner.placeStory({key,group,item,width,height});
 if(p&&p!==previous){if(!previous)storyGrowth.set(key,0);setTarget();refresh()}
 return p?project(p.rect):null;
}
function setTarget(){
 if(view.type==='home')target={x:W*(W<700?.48:.40),y:0};
 else if(view.type==='story'&&planner.stories.has(view.key)){
  const p=planner.stories.get(view.key).rect;
  target={x:(W<700?26:Math.max(60,(W/zoom-Math.min(p.w,640))*.5))-p.x,y:H/zoom*.20-p.y};
 }else{
  const p=planner.branches.get(view.group)?.point(.45)||anchor(view.group);
  target={x:W/zoom*.5-p.x,y:H/zoom*.48-p.y};
 }
 if(!initialized&&W&&H){current={x:W*(W<700?.48:.40),y:0};initialized=true}
 if(paused)current={...target};
}
function drawPath(points,reach,size,thickness=5,seed=0){
 const end=Math.max(1,Math.floor((points.length-1)*reach)+1);
 const hash=i=>{const n=Math.sin(i*12.9898+seed*3.71+size*78.233)*43758.5453;return n-Math.floor(n)};
 const screen=p=>[p.x+current.x,p.y+current.y-scroll];
 // A tapering stem carries uneven forks and foliage, rather than a row of stamps.
 for(let i=1;i<end;i++){
  const t=i/(points.length-1),width=Math.max(.4,thickness*Math.pow(1-t,1.1)*(1+Math.sin(t*19+seed)*.13)*Math.min(1,reach*4));
  line(ctx,[screen(points[i-1]),screen(points[i])],width,.94);
 }
 for(let i=2;i<end-1;i++){
  if(i%3!==0&&hash(i)<.91)continue;
  const p=points[i],before=points[i-1],after=points[Math.min(i+1,points.length-1)],t=i/(points.length-1);
  const grow=Math.max(0,Math.min(1,(reach-t)*18));if(!grow)continue;
  const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1,tx=dx/length,ty=dy/length;
  const side=hash(i+51)>.5?1:-1,nx=-ty*side,ny=tx*side;
  const fork=size*(.3+hash(i+9)*.9)*(1-t*.35)*grow;
  const tip={x:p.x+nx*fork+tx*fork*.45,y:p.y+ny*fork+ty*fork*.45};
  const mid={x:p.x+nx*fork*.45+tx*fork*.1,y:p.y+ny*fork*.45+ty*fork*.1};
  line(ctx,[screen(p),screen(mid),screen(tip)],Math.max(.55,size*.055*(1-t)),.9);
  const radius=size*(.55+hash(i+29)*.8)*(1-t*.5)*grow;
  ctx.save();ctx.translate(tip.x+current.x,tip.y+current.y-scroll);
  ctx.rotate(Math.atan2(ty,tx)+side*(.3+hash(i+3)*.65));
  ctx.drawImage(brush,-radius,-radius*.6,radius*2,radius*1.2);ctx.restore();
  if(hash(i+7)>.35){
   const small=radius*(.35+hash(i+11)*.3);
   ctx.drawImage(brush,mid.x+current.x-small,mid.y+current.y-scroll-small*.7,small*2,small*1.4);
  }
 }
}
function renderBoughs(){
 for(const b of branches.values()){
  const base=project(baseAnchor(b.key)),label=project(anchor(b.key));
  if(b.growth<.25)line(ctx,[[base.x,base.y-scroll],[label.x,label.y-scroll]],1.7,1-b.growth*4);
  const plan=planner.branches.get(b.key);
  if(!plan||b.growth<=0)continue;
  if(b.key!=='me')drawPath(plan.points,b.growth,plan.foliage,plan.thickness,plan.seed);
  for(let i=0;i<b.count;i++){
   const n=nodeGeometry(b.key,i,b.count);if(n.opacity<=0)continue;
   line(ctx,[[n.x,n.y-scroll],[n.label.x,n.label.y-scroll]],Math.max(.5,1.5*(1-n.t)),n.opacity*.72);
  }
 }
 for(const [key,p] of planner.stories)drawPath(p.points,storyGrowth.get(key)||0,p.foliage,p.thickness,p.seed);
}
function drawSoil(groundY){
 const visibleHeight=H/zoom,visibleWidth=W/zoom;
 if(groundY>visibleHeight+30)return;
 ctx.drawImage(rootArt,current.x-450,groundY-3,900,1800);
 for(let band=Math.max(0,Math.floor((scroll-H-current.y)/120)-1);band<Math.ceil((scroll+visibleHeight-current.y)/120);band++){
  rng=(scenerySeed^8721)+band*331;
  for(let i=0;i<visibleWidth*.7;i++){
   const x=r(panX-W,panX+visibleWidth+W),depth=band*120+r(0,120),y=H+current.y+depth-scroll;
   if(y<groundY||y>visibleHeight+20||y<-20)continue;
   const fade=depth<100?.5*(1-depth/140):.16;
   ctx.globalAlpha=r(.04,fade);ctx.fillStyle=INK;ctx.fillRect(x,y,r(.4,1.4),r(.4,1.4));
  }
 }ctx.globalAlpha=1;
 const first=Math.max(0,Math.floor((scroll-H-current.y)/150)-1),lastBand=Math.ceil((scroll+visibleHeight-H-current.y)/150);
 for(let band=first;band<=lastBand;band++){
  rng=4599+band*177;
  for(let j=0;j<Math.ceil(W/30);j++){
   const x=(r(0,W)+current.x-W*.40+W)%W,y=H+current.y+band*150+r(0,150)-scroll;
   if(y<groundY+12||y<-60||y>visibleHeight+60)continue;
   const big=j%29===0,size=big?r(12,32):r(1.2,6);
   for(let offset=Math.floor(panX/W)*W-W;offset<panX+visibleWidth+W;offset+=W)ctx.drawImage(rocks[(j+band)%rocks.length],x+offset,y,size,size*.8);
  }
 }
}
function render(){
 if(!W||!H)return;
 const visibleWidth=W/zoom,visibleHeight=H/zoom;
 ctx.clearRect(0,0,visibleWidth,visibleHeight);ctx.fillStyle=BG;ctx.fillRect(0,0,visibleWidth,visibleHeight);
 ctx.save();ctx.translate(-panX,0);
 rng=92272;
 for(let i=0;i<115;i++){
  const x=panX+random()*visibleWidth,y=(random()*visibleHeight*1.8-clock*r(.1,.5)-scroll*.15)%(visibleHeight+10);
  if(y>0&&y<visibleHeight){ctx.fillStyle=INK;ctx.globalAlpha=r(.1,.7);ctx.fillRect(x,y,r(.35,.85),r(.35,.85))}
 }ctx.globalAlpha=1;
 const groundY=H-4+current.y-scroll;
 drawSoil(groundY);
 window.forestRoots?.draw(ctx,{width:W,height:visibleHeight,camera:current,ground:H-4+current.y,scroll,clock,paused});
 const {sx,sy}=treeSize(),tw=600*sx,th=1050*sy;
 ctx.drawImage(treeArt,current.x-tw*.5,H-4+current.y-scroll-th,tw,th);
 renderBoughs();
 const groundShift=(current.x-W*(W<700?.48:.40))%W;
 for(let x=groundShift+Math.floor((panX-groundShift)/W)*W-W;x<panX+visibleWidth+W;x+=W)ctx.drawImage(ground,0,0,ground.width,ground.height,x,groundY-136,W,235);
 ctx.restore();
 ctx.fillStyle=pattern;ctx.fillRect(0,0,visibleWidth,visibleHeight);
 // Thin the ink only where it passes behind text; the landscape stays continuous.
 for(const a of textAreas){const y=a.y-scroll;if(y+a.h<0||y>visibleHeight)continue;ctx.drawImage(textFade,a.x-26,y-16,a.w+52,a.h+32)}
}
function isMoving(){
 return Math.abs(current.x-target.x)+Math.abs(current.y-target.y)>.05||
 [...branches.values()].some(b=>Math.abs(b.growth-(b.open?1:0))>.001)||
 (view.type==='story'&&connector<1)||Boolean(window.forestRoots?.moving)||[...storyGrowth.values()].some(v=>v<1);
}
function tick(now){
 frame=0;
 if(!document.hidden&&(now-last>32||isMoving())){
  const dt=Math.min((now-last)/1000,.07),moving=isMoving();clock+=dt;last=now;
  const f=paused?1:1-Math.exp(-dt*5);
  for(const key of ['x','y'])current[key]+=(target[key]-current[key])*f;
  for(const b of branches.values()){
   const goal=b.open?1:0;
   b.growth=paused?goal:goal>b.growth?Math.min(goal,b.growth+dt*.75):Math.max(goal,b.growth-dt*1.5);
   if(!b.open&&b.growth===0)planner.branches.delete(b.key);
  }
  for(const [key,growth] of storyGrowth)storyGrowth.set(key,paused?1:Math.min(1,growth+dt*.8));
  if(resetting&&[...branches.values()].every(b=>b.growth===0)){planner.reset();resetting=false}
  window.forestRoots?.tick(dt,paused);
  if(moving)layoutCallback();
  render();
 }
 if(!document.hidden&&(!paused||isMoving()))frame=requestAnimationFrame(tick);
}
function refresh(){cancelAnimationFrame(frame);frame=0;render();if(!document.hidden)frame=requestAnimationFrame(tick)}
function resize(){
 const changed=W!==viewport.clientWidth||H!==viewport.clientHeight;
 W=viewport.clientWidth;H=viewport.clientHeight;
 if(changed&&initialized){planner.reset();storyGrowth.clear();for(const b of branches.values())if(b.open)ensureBranch(b.key,b.count)}DPR=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.ceil(W*DPR);canvas.height=Math.ceil(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';
 ctx.setTransform(DPR*zoom,0,0,DPR*zoom,0,0);pattern=ctx.createPattern(grain,'repeat');drawGroundArt();setTarget();layoutCallback();refresh();
 window.dispatchEvent(new CustomEvent('forest-resize'));
}
function setView(next){
 view=next;
 if(next.type==='home'){
  for(const b of branches.values())b.open=false;
  planner.resetStories();storyGrowth.clear();resetting=true;
 }else{
  if(resetting){planner.reset();for(const b of branches.values()){b.growth=0;b.open=false}resetting=false}
  for(const b of branches.values())b.open=b.key===next.group;
  for(const key of planner.stories.keys())if(next.type!=='story'||key!==next.key){planner.stories.delete(key);storyGrowth.delete(key)}
  const b=branches.get(next.group);b.open=true;b.count=next.count||0;ensureBranch(b.key,b.count);
 }
 if(paused)for(const b of branches.values())b.growth=b.open?1:0;
 setTarget();layoutCallback();refresh();
}
viewport.addEventListener('scroll',()=>{syncScroll();if(paused)render()},{passive:true});
document.addEventListener('visibilitychange',refresh);
motion.addEventListener('click',()=>{paused=!paused;syncMotion()});
function syncMotion(){motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume animation':'Pause animation');motion.textContent=paused?'▷':'Ⅱ';refresh()}
reduced.addEventListener('change',e=>{paused=e.matches;syncMotion()});
function worldBounds(){
 const {sx,sy}=treeSize(),groundY=H-4+current.y;
 const box={minX:Math.min(0,current.x-450),maxX:Math.max(W/zoom,current.x+450),minY:Math.min(0,groundY-1050*sy),maxY:Math.max(H/zoom,groundY+1800)};
 const include=(p,margin=32)=>{box.minX=Math.min(box.minX,p.x-margin);box.maxX=Math.max(box.maxX,p.x+margin);box.minY=Math.min(box.minY,p.y-margin);box.maxY=Math.max(box.maxY,p.y+margin)};
 include({x:current.x-300*sx,y:groundY-1050*sy});include({x:current.x+300*sx,y:groundY});
 for(const b of branches.values())if(b.growth>0)for(let i=0;i<=40;i++)include(project(curve(b.key,b.growth*i/40)),W<700?48:80);
 for(const p of planner.stories.values()){include(project({x:p.rect.x,y:p.rect.y}));include(project({x:p.rect.x+p.rect.w,y:p.rect.y+p.rect.h}));for(const q of p.points)include(project(q),45)}
 return box;
}
function syncScroll(){scroll=viewport.scrollTop/zoom-scrollOrigin.top;panX=viewport.scrollLeft/zoom-scrollOrigin.left}
function setZoom(value,x=W/2,y=H/2){
 if(!Number.isFinite(value))return;
 const next=Math.max(.35,Math.min(1.6,value));if(next===zoom)return;
 syncScroll();
 const anchor={x:panX+x/zoom,y:scroll+y/zoom};
 zoom=next;panX=anchor.x-x/zoom;scroll=anchor.y-y/zoom;
 // Pinching changes the view, never the branch geometry.
 target={...current};
 ctx.setTransform(DPR*zoom,0,0,DPR*zoom,0,0);
 layoutCallback();refresh();
}
window.forestScene={
 setView,nodeGeometry,primaryGeometry,storyGeometry,placeStory,setZoom,wake:refresh,
 get zoom(){return zoom},
 get scrollOffset(){return {left:panX,top:scroll}},
 get homeScroll(){return {left:scrollOrigin.left*zoom,top:scrollOrigin.top*zoom}},
 branchBase(key){return project(baseAnchor(key))},
 branchPoint(key,t){return project(curve(key,t))},
 setLabelAnchor(key,i,p){labelAnchors.set(key+'/'+i,{x:p.x-current.x,y:p.y-current.y})},
 onLayout(callback){layoutCallback=callback},
 setTextAreas(areas){textAreas=areas;if(paused)render()},
 get size(){return {width:W,height:H,rootDepth:1800}},
 get scrollOrigin(){return {...scrollOrigin}},
 setScrollOrigin(next){scrollOrigin={...next}},syncScroll,
 get bounds(){return worldBounds()},
 get state(){return {zoom,view:{...view},camera:{...current},branches:[...branches.values()].map(b=>({...b})),stories:[...planner.stories.values()].map(p=>({key:p.key,rect:{...p.rect}}))}},
 render
};
new ResizeObserver(resize).observe(viewport);
})();
