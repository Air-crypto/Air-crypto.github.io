/* Original, seeded botanical drawing. No scene images or code from the reference. */
(() => {
  'use strict';
  const sky = document.getElementById('sky');
  const tree = document.getElementById('tree');
  const meadow = document.getElementById('meadow');
  const contexts = [sky, tree, meadow].map(c => c.getContext('2d'));
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.getElementById('motion-toggle');
  let paused = motionQuery.matches;
  let width = 0, height = 0, raf = 0, previous = 0, elapsed = 0;
  let pointer = {x: 0, y: 0}, drift = 0;
  let seed = 28391;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const range = (a,b) => a + random() * (b-a);
  const art = document.createElement('canvas');
  art.width = 900; art.height = 1300;
  const ink = art.getContext('2d');
  const dots = [];
  const leaves = [];
  const stroke = (points, thickness, alpha) => {
    ink.strokeStyle = 'rgba(215,214,208,' + alpha + ')';
    ink.lineWidth = thickness;
    ink.lineCap = 'round';
    ink.beginPath();
    ink.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(p => ink.lineTo(p[0],p[1]));
    ink.stroke();
  };
  function foliage(x,y,size) {
    const tilt = range(-.7,.7);
    for (let i=0; i<size*17; i++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random());
      const dx = Math.cos(angle)*radius*size;
      const dy = Math.sin(angle)*radius*size*.58;
      const px = x + dx*Math.cos(tilt)-dy*Math.sin(tilt);
      const py = y + dx*Math.sin(tilt)+dy*Math.cos(tilt);
      leaves.push({x:px,y:py,r:range(.85,2.5),a:range(.28,.84)});
    }
  }
  function twig(x,y,length,angle,thickness,depth) {
    const endX=x+Math.cos(angle)*length, endY=y+Math.sin(angle)*length;
    const midX=x+(endX-x)*.46+range(-9,9);
    const midY=y+(endY-y)*.5+range(-7,7);
    stroke([[x,y],[midX,midY],[endX,endY]],thickness,.53);
    for(let i=0;i<length*1.7;i++){
      const t=random();
      dots.push({x:x+(endX-x)*t+range(-thickness,thickness),y:y+(endY-y)*t+range(-thickness,thickness),r:range(.35,1.2),a:range(.15,.6)});
    }
    if(depth===1) foliage(endX,endY,range(20,32));
    if(depth>0){
      twig(endX,endY,length*range(.57,.76),angle+range(-.6,.06),thickness*.62,depth-1);
      twig(x+(endX-x)*.69,y+(endY-y)*.69,length*range(.5,.7),angle+range(.22,.85),thickness*.54,depth-1);
      if(depth===2) twig(endX,endY,length*.52,angle-.85,thickness*.48,0);
    }else foliage(endX,endY,range(24,39));
  }
  const trunk=[[450,1244],[446,1100],[462,965],[445,815],[465,650],[450,490],[464,330],[457,190],[465,120]];
  for(let i=0;i<trunk.length-1;i++){
    const a=trunk[i], b=trunk[i+1], thickness=10-i*.95;
    stroke([a,b],thickness,.65);
    for(let j=0;j<850;j++){
      const t=random();
      dots.push({x:a[0]+(b[0]-a[0])*t+range(-thickness*.72,thickness*.72),y:a[1]+(b[1]-a[1])*t,r:range(.35,1.3),a:range(.15,.75)});
    }
  }
  const boughs=[
    [451,1040,85,-2.6],[453,990,110,-.6],
    [451,914,139,-2.72],[449,845,155,-.69],
    [453,765,145,-2.8],[460,695,161,-.63],
    [460,600,124,-2.6],[451,525,139,-.76],
    [456,440,117,-2.47],[462,355,97,-.9],
    [458,280,70,-2.35],[460,210,61,-1.12],
    [462,153,42,-1.7]
  ];
  boughs.forEach(([x,y,len,angle],i)=>twig(x,y,len,angle,i<7?5.2:3.4,3));
  foliage(463,127,27);
  // Individual specks retain paper-like air between the leaves.
  for(const p of [...dots,...leaves]){
    ink.fillStyle='rgba(226,224,216,'+p.a+')';
    ink.fillRect(p.x,p.y,p.r,p.r*range(.65,1.3));
  }
  const stars=Array.from({length:85},()=>({x:random(),y:random(),r:range(.35,1),phase:range(0,6.28),speed:range(.2,.7)}));
  function drawMeadow(){
    const ctx=contexts[2];
    ctx.clearRect(0,0,width,height);
    seed=68439;
    const ground=height-1;
    // Uneven grasses and a few wildflowers, denser near the tree.
    for(let i=0;i<Math.min(width*1.1,1500);i++){
      const x=random()*width;
      const cluster=.3+.7*Math.pow(Math.sin(x*.007),2);
      let tall=range(6,48)*cluster;
      if(x>width*.68) tall*=.65;
      const bend=range(-18,18);
      ctx.strokeStyle='rgba(199,198,189,'+range(.16,.56)+')';
      ctx.lineWidth=range(.45,1.05);
      ctx.beginPath();ctx.moveTo(x,ground);ctx.quadraticCurveTo(x+bend*.3,ground-tall*.65,x+bend,ground-tall);ctx.stroke();
      if(i%14===0){
        ctx.beginPath();ctx.moveTo(x+bend*.15,ground-tall*.35);ctx.lineTo(x-7,ground-tall*.55);ctx.stroke();
      }
    }
    for(let i=0;i<15;i++){
      const x=range(12,width*.7), tall=range(35,96), bend=range(-20,20);
      ctx.strokeStyle='rgba(205,202,191,.5)';ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(x,ground);ctx.quadraticCurveTo(x+bend*.7,ground-tall*.7,x+bend,ground-tall);ctx.stroke();
      for(let j=0;j<16;j++){
        const a=random()*6.28,r=random()*6;
        ctx.fillStyle='rgba(214,211,200,'+range(.25,.7)+')';
        ctx.fillRect(x+bend+Math.cos(a)*r,ground-tall+Math.sin(a)*r,1.4,1.4);
      }
    }
  }
  function render(){
    const [s,t]=contexts;
    s.clearRect(0,0,width,height);
    for(const p of stars){
      const y=(p.y*height-elapsed*p.speed*2+height)%height;
      s.fillStyle='rgba(224,220,208,'+(.15+.16*Math.sin(elapsed*.4+p.phase))+')';
      s.beginPath();s.arc(p.x*width,y,p.r,0,Math.PI*2);s.fill();
    }
    t.clearRect(0,0,width,height);
    const mobile=width<700;
    const treeH=height*(mobile?.76:.88);
    const scale=treeH/1300;
    const treeW=mobile?width*.62:900*scale;
    const left=width*(mobile?.47:.445)-treeW/2;
    const top=height-treeH+15*scale;
    drift += (pointer.x-drift)*.025;
    // Warp horizontal slices gently: the trunk stays rooted while the canopy moves.
    for(let row=0;row<1300;row+=8){
      const lift=Math.pow(1-row/1300,1.9);
      const sway=paused?0:(Math.sin(elapsed*.62+row*.0014)*4+drift*2.5)*lift;
      t.drawImage(art,0,row,900,8,left+sway,top+row*scale,treeW,8*scale+.4);
    }
  }
  function frame(now){
    raf=0;
    if(document.hidden||paused){render();return;}
    if(now-previous>=32){
      elapsed+=Math.min((now-previous)/1000,.08);
      previous=now;render();
    }
    raf=requestAnimationFrame(frame);
  }
  function schedule(){
    cancelAnimationFrame(raf);raf=0;
    render();
    if(!paused&&!document.hidden){previous=performance.now();raf=requestAnimationFrame(frame);}
  }
  function resize(){
    const rect=sky.getBoundingClientRect();
    width=rect.width;height=rect.height;
    const ratio=Math.min(devicePixelRatio||1,2);
    [sky,tree,meadow].forEach((c,i)=>{
      c.width=Math.round(width*ratio);c.height=Math.round(height*ratio);
      contexts[i].setTransform(ratio,0,0,ratio,0,0);
    });
    drawMeadow();schedule();
  }
  function syncMotion(){
    motionButton.setAttribute('aria-pressed',String(paused));
    motionButton.setAttribute('aria-label',paused?'Resume scene animation':'Pause scene animation');
    motionButton.innerHTML=paused?'resume the breeze <span aria-hidden="true">▷</span>':'pause the breeze <span aria-hidden="true">Ⅱ</span>';
    schedule();
  }
  motionButton.addEventListener('click',()=>{paused=!paused;syncMotion();});
  motionQuery.addEventListener('change',e=>{paused=e.matches;syncMotion();});
  document.addEventListener('visibilitychange',schedule);
  document.getElementById('grove').addEventListener('pointermove',e=>{pointer.x=(e.clientX/width-.5)*2;});
  new ResizeObserver(resize).observe(document.getElementById('grove'));
  syncMotion();
})();

(() => {
  'use strict';
  const music=document.querySelector('.music');
  const panel=document.getElementById('music-panel');
  const button=document.getElementById('music-toggle');
  const icon=document.getElementById('play-icon');
  const status=document.getElementById('music-status');
  let player=null, ready=false, loading=false, wantsPlay=false, hasPlayed=false, timeout;
  function playing(active){
    music.classList.toggle('is-playing',active);
    icon.textContent=active?'Ⅱ':'▶';
    button.setAttribute('aria-label',(active?'Pause':'Play')+' Unethical by Faouzia');
  }
  function close(){
    wantsPlay=false;
    if(ready) player.pauseVideo();
    panel.hidden=true;
    button.setAttribute('aria-expanded','false');
    playing(false);
  }
  function load(){
    if(loading) return;
    loading=true;
    timeout=setTimeout(()=>{status.textContent='If the player is unavailable, listen on YouTube below.';},12000);
    window.onYouTubeIframeAPIReady=()=>{
      player=new YT.Player('youtube-player',{
        width:320,height:210,videoId:'I1zqCX3Dvxo',
        host:'https://www.youtube-nocookie.com',
        playerVars:{playsinline:1,rel:0,origin:location.origin},
        events:{
          onReady:()=>{
            ready=true;clearTimeout(timeout);
            player.getIframe().title='Unethical by Faouzia — official music video';
            player.getIframe().setAttribute('referrerpolicy','strict-origin-when-cross-origin');
            status.textContent='Press play in the video if playback does not begin.';
            if(wantsPlay)player.playVideo();
          },
          onStateChange:e=>{
            const active=e.data===YT.PlayerState.PLAYING;
            playing(active);
            if(active){hasPlayed=true;status.textContent='Now playing · Unethical by Faouzia';}
            if(e.data===YT.PlayerState.PAUSED)status.textContent=hasPlayed?'Paused':'Press play in the video to start listening.';
            if(e.data===YT.PlayerState.ENDED){wantsPlay=false;status.textContent='Play it again whenever you like.';}
          },
          onError:()=>{clearTimeout(timeout);playing(false);status.textContent='The video could not play here. Listen on YouTube below.';}
        }
      });
    };
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';
    script.onerror=()=>{clearTimeout(timeout);status.textContent='The player could not load. Listen on YouTube below.';loading=false;script.remove();};
    document.head.append(script);
  }
  button.addEventListener('click',()=>{
    if(music.classList.contains('is-playing')){player.pauseVideo();wantsPlay=false;return;}
    panel.hidden=false;button.setAttribute('aria-expanded','true');wantsPlay=true;
    if(ready)player.playVideo();else load();
  });
  document.getElementById('music-close').addEventListener('click',()=>{close();button.focus();});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){close();button.focus();event.stopPropagation();}});
})();
