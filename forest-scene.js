/* Procedural ink scenery, independently drawn for Arihan's portfolio. */
(() => {
'use strict';
const viewport=document.getElementById('forest-viewport');
const canvas=document.getElementById('landscape');
const ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motion=document.getElementById('motion-toggle');
const INK='#b8bbc3',BG='#2a282c';
let W=0,H=0,DPR=1,scroll=0,clock=0,last=0,frame=0,paused=reduced.matches;
let view={type:'home',side:1,count:0}, current={x:0,y:0,scale:1},target={x:0,y:0,scale:1},initialized=false,growth=1;
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
rng=29137;
// A narrow, asymmetric canopy with open pockets and ragged, stippled edges.
const spine=[[300,1030],[299,905],[305,790],[300,680],[294,570],[305,450],[295,330],[303,205],[289,90]];
for(let i=0;i<spine.length-1;i++)line(tc,[spine[i],spine[i+1]],7.5-i*.62);
const crowns=[
[286,91,27,43,-.25],[310,150,48,40,.4],[257,177,36,37,.2],[341,192,41,32,-.2],
[303,230,31,36,.1],[346,285,43,42,.3],[250,299,46,32,-.35],[213,329,26,32,-.2],
[284,346,45,37,-.2],[338,365,55,39,.1],[367,407,35,38,.6],[312,422,57,35,.1],
[242,425,50,34,-.3],[202,458,32,38,.4],[253,495,39,34,.2],[307,489,53,37,-.2],
[354,520,52,38,.2],[286,554,53,32,-.3],[225,569,43,42,.3],[195,600,33,39,-.1],
[247,627,48,38,.1],[308,620,48,44,-.2],[352,654,35,38,.3],[293,679,47,34,.1],
[258,713,38,35,-.3],[228,752,26,25,.1],[303,742,23,31,.1]
];
crowns.forEach(([x,y,rx,ry,a],i)=>{
 const at=[300+Math.sin(y*.012)*5,y+30];
 line(tc,[at,[x+(300-x)*.35,y+12],[x,y]],r(1.8,4));
 roughBlob(tc,x,y,rx,ry,a);
 for(let j=0;j<3;j++)roughBlob(tc,x+r(-rx*.7,rx*.7),y+r(-ry*.7,ry*.7),rx*r(.2,.44),ry*r(.2,.45),r(-1,1));
});
// Long, bare twigs are the landing points for the labels.
line(tc,[[297,265],[237,257],[170,247],[150,241]],3);
line(tc,[[302,345],[355,344],[415,331],[450,323]],2.7);
line(tc,[[299,487],[240,489],[160,482],[120,477]],3);
line(tc,[[304,590],[363,586],[417,572],[447,565]],2.6);
tc.globalCompositeOperation='source-atop';
for(let i=0;i<69000;i++){tc.globalAlpha=r(.08,.7);tc.fillStyle=BG;tc.fillRect(r(130,420),r(40,1030),r(.4,1.7),r(.4,1.5))}
tc.globalAlpha=1;tc.globalCompositeOperation='source-over';
const brush=surface(140,120),bc=brush.getContext('2d');roughBlob(bc,70,60,51,40,-.1);
bc.globalCompositeOperation='source-atop';for(let i=0;i<4800;i++){bc.globalAlpha=r(.15,.7);bc.fillStyle=BG;bc.fillRect(r(0,140),r(0,120),r(.4,1.2),r(.4,1.5))}bc.globalAlpha=1;
const ground=surface(1,1);
const rootArt=surface(1000,900),rc=rootArt.getContext('2d');
rng=44271;
function root(x,y,len,angle,thick,depth){
 const ex=x+Math.cos(angle)*len,ey=y+Math.sin(angle)*len;
 const mid=[x+(ex-x)*.5+r(-12,12),y+(ey-y)*.5+r(-12,12)];
 line(rc,[[x,y],mid,[ex,ey]],thick,.9);
 if(depth>0){root(ex,ey,len*r(.56,.76),angle+r(-.4,.4),thick*.63,depth-1);root(mid[0],mid[1],len*r(.43,.7),angle+r(-.9,.9),thick*.54,depth-1)}
}
for(let i=0;i<11;i++)root(500+r(-12,12),0,r(65,160),r(.15,2.95),r(1.8,4.7),5);
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
 ground.width=Math.ceil(W*DPR);ground.height=Math.ceil(170*DPR);
 const g=ground.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);
 rng=47213;const bottom=136;
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
 for(let i=0;i<W*2.8;i++){g.fillStyle=INK;g.globalAlpha=r(.3,.8);g.fillRect(r(0,W),bottom+r(-2,20),r(.5,1.5),r(.7,1.5))}
 g.globalAlpha=1;
}
function nodeGeometry(i,count){
 const mobile=W<700,side=view.side||1,t=count===1?.53:(i+.45)/(count+.25);
 const x=side>0?W*(.30+.43*t)+Math.sin(t*15)*10:W*(.70-.41*t)+Math.sin(t*15)*10;
 const y=H*(.94-.88*t)+Math.sin(t*12)*6;
 return {x,y,side:(i%2===0?-1:1),index:i,mobile};
}
function setTarget(){
 const mobile=W<700;
 const s=H*.82/990;
 if(view.type==='home')target={x:W*(mobile?.48:.40),y:H-4,scale:s};
 else if(view.type==='menu')target={x:W*(view.side>0?.25:.72),y:H*2.4,scale:s*1.3};
 else target={x:W*(mobile?-.38:.08),y:H-4,scale:s*1.3};
 if(!initialized||paused){current={...target};initialized=true;}
}
function renderBough(){
 if(view.type==='home')return;
 const article=view.type==='story';
 const mobile=W<700;
 let start,end;
 if(article){start={x:mobile?-20:current.x+8,y:mobile?50:H*.25};end={x:W*(mobile?.70:.405),y:mobile?136:H*.28};}
 else {start={x:W*(view.side>0?.30:.70),y:H*.94};end={x:W*(view.side>0?.73:.29),y:H*.06};}
 const dx=end.x-start.x,dy=end.y-start.y,steps=article?15:26;
 const reach=paused?1:Math.min(1,growth);
 line(ctx,[[start.x,start.y-scroll],[start.x+dx*reach*.5-15*reach,start.y+dy*reach*.5-scroll],[start.x+dx*reach,start.y+dy*reach-scroll]],2,.9);
 for(let i=0;i<steps;i++){
  const t=(i+.5)/steps;if(t>reach)continue;const x=start.x+dx*t+Math.sin(t*15)*10,y=start.y+dy*t+Math.sin(t*12)*6-scroll;
  const size=(article?28:35)*(1-.35*t)*(mobile?.72:1)*Math.min(1,(reach-t)*12);
  ctx.drawImage(brush,x-size,y-size*.76,size*2,size*1.55);
 }
 if(!article)for(let i=0;i<view.count;i++){
  if((i+.45)/(view.count+.25)>reach)continue;const n=nodeGeometry(i,view.count),side=n.side,ex=n.x+side*(mobile?14:26);
  line(ctx,[[n.x,n.y-scroll],[ex,n.y-14-scroll]],1.2);
 }
}
function drawSoil(groundY){
 if(groundY>H+30)return;
 ctx.drawImage(rootArt,(W<700&&view.type==='story'?W*.15:current.x)-300,groundY-3,600,540);
 const top=Math.max(0,scroll-H),bottom=scroll+H+100;
 // Deterministic layers make scrolling continuous instead of regenerating the earth.
 for(let level=0;level<Math.ceil((scroll+H)/220)+1;level++){
  rng=8721+level*331;
  const worldY=H+level*220+100,y=worldY-scroll;
  if(y < -100 || y>H+100)continue;
  for(let x=0;x<W;x+=r(4,12)){
   const wave=Math.sin(x*.012+level)*11+Math.sin(x*.033)*3;
   ctx.globalAlpha=r(.35,.85);ctx.fillStyle=INK;ctx.beginPath();ctx.ellipse(x,y+wave,r(.6,1.6),r(.5,1.2),r(-.3,.3),0,6.28);ctx.fill();
  }
  ctx.globalAlpha=1;
 }
 const first=Math.max(0,Math.floor((scroll-H)/150)-1),lastBand=Math.ceil((scroll+H)/150);
 for(let band=first;band<=lastBand;band++){
  rng=4599+band*177;
  for(let j=0;j<Math.ceil(W/30);j++){
   const x=r(0,W),y=H+band*150+r(0,150)-scroll;
   if(y<groundY+12||y<-60||y>H+60)continue;
   const big=j%19===0,size=big?r(30,68):r(2,10);
   ctx.drawImage(rocks[(j+band)%rocks.length],x,y,size,size*.8);
  }
 }
}
function render(){
 if(!W||!H)return;
 ctx.clearRect(0,0,W,H);ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
 rng=92272;
 for(let i=0;i<115;i++){
  const x=random()*W,y=(random()*H*1.8-clock*r(.1,.5)-scroll*.15)%(H+10);
  if(y>0&&y<H){ctx.fillStyle=INK;ctx.globalAlpha=r(.1,.7);ctx.fillRect(x,y,r(.35,.85),r(.35,.85))}
 }ctx.globalAlpha=1;
 const groundY=H-4-scroll;
 drawSoil(groundY);
 const tw=W<700?Math.min(600*current.scale,W*.72):600*current.scale*1.55,th=1050*current.scale;
 const sway=paused?0:Math.sin(clock*.8)*1.1;
 ctx.save();ctx.translate(current.x,current.y-scroll);ctx.transform(1,0,sway*.0008,1,0,0);
 ctx.drawImage(treeArt,-tw*.5,-th,tw,th);ctx.restore();
 renderBough();
 ctx.drawImage(ground,0,0,ground.width,ground.height,0,groundY-136,W,170);
 ctx.fillStyle=pattern;ctx.fillRect(0,0,W,H);
 // Thin the ink only where it passes behind text; the landscape stays continuous.
 for(const a of textAreas){const y=a.y-scroll;if(y+a.h<0||y>H)continue;ctx.drawImage(textFade,a.x-26,y-16,a.w+52,a.h+32)}
}
function tick(now){
 frame=0;const moving=growth<1||Math.abs(current.x-target.x)+Math.abs(current.y-target.y)+Math.abs(current.scale-target.scale)>0.03;
 if(!document.hidden&&(now-last>32||moving)){
  const f=paused?1:.11;
  for(const k of ['x','y','scale'])current[k]+=(target[k]-current[k])*f;
  const dt=Math.min((now-last)/1000,.07);clock+=dt;growth=paused?1:Math.min(1,growth+dt*.9);last=now;render();
 }
 if(!document.hidden&&(!paused||moving))frame=requestAnimationFrame(tick);
}
function refresh(){cancelAnimationFrame(frame);frame=0;render();if(!document.hidden)frame=requestAnimationFrame(tick)}
function resize(){
 W=viewport.clientWidth;H=viewport.clientHeight;DPR=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.ceil(W*DPR);canvas.height=Math.ceil(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';
 ctx.setTransform(DPR,0,0,DPR,0,0);pattern=ctx.createPattern(grain,'repeat');drawGroundArt();setTarget();refresh();
 window.dispatchEvent(new CustomEvent('forest-resize'));
}
function setView(next){view=next;growth=paused?1:0;setTarget();refresh()}
viewport.addEventListener('scroll',()=>{scroll=viewport.scrollTop;if(paused)render()},{passive:true});
document.addEventListener('visibilitychange',refresh);
motion.addEventListener('click',()=>{paused=!paused;syncMotion()});
function syncMotion(){motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume animation':'Pause animation');motion.textContent=paused?'▷':'Ⅱ';refresh()}
reduced.addEventListener('change',e=>{paused=e.matches;syncMotion()});
window.forestScene={setView,nodeGeometry,setTextAreas(areas){textAreas=areas;if(paused)render()},get size(){return {width:W,height:H}},render};
new ResizeObserver(resize).observe(viewport);
})();
