(() => {
'use strict';
const viewport=document.getElementById('forest-viewport'),world=document.getElementById('world'),space=document.getElementById('world-space');
const nav=document.getElementById('forest-navigation'),story=document.getElementById('story'),back=document.getElementById('back');
const cache=new Map();let route='',request=0,returnTo='',mode='home',activeMenu=null;
const menus={
 work:{label:'my work',side:-1,parent:'',items:[
  ['AMD · language models','work/amd'],['AMD · hardware traces','work/amd-intern'],['ARLIS','work/arlis'],['UW–Madison','work/research'],['Theom','work/theom'],['robotics','work/robotics'],['say hello','contact']]},
 projects:{label:'projects',side:1,parent:'',items:[
  ['machine learning','projects/ml'],['hardware & systems','projects/systems'],['this website','projects/website']]},
 'projects/ml':{label:'machine learning',side:1,parent:'projects',items:[
  ['quantum error mitigation','projects/quantum'],['gradient descent','projects/gradients'],['acoustic keylogging','projects/acoustic'],['video understanding','projects/video'],['ASL translator','projects/asl']]},
 'projects/systems':{label:'hardware & systems',side:1,parent:'projects',items:[
  ['VLIW / SIMD','projects/simd'],['eBike controller','projects/ebike'],['kernel scheduler','projects/kernel'],['guitar tuner','projects/guitar'],['LED controller','projects/led']]},
 life:{label:'life',side:-1,parent:'',items:[
  ['on the ice','life/skating'],['window seats','life/flights'],['Madison','life/madison'],['northern lights','life/aurora'],['SF on the Fourth','life/sf'],['the eclipse','life/eclipse'],['little things','life/little']]}
};
// One level of leaves per limb; former category URLs remain compatible.
menus.projects.items=[...menus['projects/ml'].items,...menus['projects/systems'].items,['this website','projects/website']];
delete menus['projects/ml'];delete menus['projects/systems'];
const entries={};
[
['amd',0,'AMD · language models'],['amd-intern',1,'AMD · hardware traces'],['arlis',2,'ARLIS'],['research',3,'UW–Madison'],['theom',4,'Theom'],['robotics',5,'Wisconsin Robotics']
].forEach(([key,index,title])=>entries['work/'+key]={path:'portfolio.html#experience',selector:'.experience-entry',index,title,parent:'work',kind:'work'});
[
['simd',0,'VLIW / SIMD','systems'],['ebike',1,'eBike controller','systems'],['quantum',2,'quantum error mitigation','ml'],['kernel',3,'kernel scheduler','systems'],['guitar',4,'guitar tuner','systems'],['gradients',5,'gradient descent','ml'],['led',6,'LED controller','systems'],['acoustic',7,'acoustic keylogging','ml'],['video',8,'video understanding','ml'],['asl',9,'ASL translator','ml'],['website',10,'this website','']
].forEach(([key,index,title,group])=>entries['projects/'+key]={path:'projects.html',selector:'body > section',index,title,parent:'projects',kind:'project'});
[
['skating','hockey.html','body > section','on the ice'],
['flights','gallery.html#flights','#flights','window seats'],
['madison','gallery.html#madison','#madison','Madison'],
['aurora','gallery.html#aurora','#aurora','northern lights'],
['sf','gallery.html#sanFrancisco','#sanFrancisco','SF on the Fourth'],
['eclipse','gallery.html#eclipse','#eclipse','the eclipse'],
['little','life.html#littleThings','#littleThings','little things']
].forEach(([key,path,selector,title])=>entries['life/'+key]={path,selector,title,parent:'life',kind:'life'});
entries.me={path:'portfolio.html#aboutMe',selector:'#aboutMe, #education, #patents, #activities',title:'me',parent:'',kind:'about'};
entries.contact={title:'say hello',parent:'work',kind:'contact',path:'mailto:apyadav@wisc.edu'};
const aliases={'projects/ml':'projects','projects/systems':'projects',about:'me',experience:'work',studentlife:'me',hardware:'projects',littlethings:'life/little',flights:'life/flights',madison:'life/madison',aurora:'life/aurora',eclipse:'life/eclipse',sanfrancisco:'life/sf',skating:'life/skating',gallery:'life',swimming:'life/madison'};
const routeForOpen={about:'me',experience:'work',projects:'projects',life:'life',contact:'contact',studentlife:'me',hardware:'projects',littlethings:'life/little',flights:'life/flights',madison:'life/madison',aurora:'life/aurora',eclipse:'life/eclipse',sanfrancisco:'life/sf',skating:'life/skating',gallery:'life',swimming:'life/madison'};
async function loadPage(path){
 const file=path.split('#')[0];
 if(!cache.has(file))cache.set(file,fetch(file+'?v=forest3').then(r=>{if(!r.ok)throw Error('Could not load '+file);return r.text()}).then(text=>new DOMParser().parseFromString(text,'text/html')).catch(e=>{cache.delete(file);throw e}));
 return cache.get(file);
}
function hrefFor(key){
 if(entries[key])return entries[key].path;
 if(key.startsWith('projects'))return 'projects.html';
 if(key==='life')return 'life.html';
 return 'portfolio.html';
}
function link(label,key,selected=false){
 const a=document.createElement('a');a.className='branch-link'+(selected?' selected':'');
 a.href=hrefFor(key);a.dataset.route=key;
 const span=document.createElement('span');span.textContent=label;a.append(span);
 if(selected)a.setAttribute('aria-current','page');
 return a;
}
function at(a,x,y,align='center'){a.style.left=x+'px';a.style.top=y+'px';a.classList.toggle('is-left',align==='left');a.classList.toggle('is-right',align==='right')}
let maskFrame=0,textHitAreas=[];
function updateTextMask(){
 cancelAnimationFrame(maskFrame);
 maskFrame=requestAnimationFrame(()=>{
  const origin=viewport.getBoundingClientRect(),areas=[],scale=window.forestScene.zoom;
  for(const root of [nav,story,document.querySelector('.music-note'),document.getElementById('return-hint'),document.getElementById('signature'),document.getElementById('home-hint')]){
   if(root.hidden)continue;
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   let node;while((node=walker.nextNode())){
    if(!node.textContent.trim()||node.parentElement.closest('button.photo, .about-photos, details:not([open]) > :not(summary)'))continue;
    const range=document.createRange();range.selectNodeContents(node);
    for(const box of range.getClientRects())if(box.width&&box.height)areas.push({x:(box.left-origin.left)/scale,y:(box.top-origin.top+viewport.scrollTop)/scale-window.forestScene.scrollOrigin.top,w:box.width/scale,h:box.height/scale});
   }
  }
  textHitAreas=areas;
  const softAreas=[...areas];
  if(!story.hidden)for(const block of story.querySelectorAll('.story-entry:not([hidden]) p, .story-entry:not([hidden]) h2, .story-entry:not([hidden]) h3, .story-entry:not([hidden]) li')){
   const box=block.getBoundingClientRect();
   if(box.width&&box.height)softAreas.push({x:(box.left-origin.left)/scale,y:(box.top-origin.top+viewport.scrollTop)/scale-window.forestScene.scrollOrigin.top,w:box.width/scale,h:box.height/scale});
  }
  window.forestScene.setTextAreas(softAreas);
 });
}
const primaryLinks=new Map(),leafLinks=new Map(),articleViews=new Map();
function createNavigation(){
 for(const [label,key] of [['my work','work'],['projects','projects'],['life','life'],['me','me']]){
  const a=link(label,key);a.dataset.primary=key;primaryLinks.set(key,a);nav.append(a);
 }
 for(const [group,menu] of Object.entries(menus)){
  const links=menu.items.map(([label,key],i)=>{
   const a=link(label,key);a.classList.add('branch-leaf');a.dataset.branch=group;a.dataset.index=i;a.hidden=true;nav.append(a);return a;
  });
  leafLinks.set(group,links);
 }
}
let retainedBounds=null,lastSize=null;
function layout(){
 const scene=window.forestScene,{width:w,height:h}=scene.size;if(!w||!h)return;
 const mobile=w<700,state=scene.state,placements=[],scale=scene.zoom;
 let bounds={...scene.bounds};
 const include=(x,y,width,height)=>{bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x+width);bounds.minY=Math.min(bounds.minY,y);bounds.maxY=Math.max(bounds.maxY,y+height)};
 for(const [key,a] of primaryLinks){
  const p=scene.primaryGeometry(key),x=p.x+p.side*10,align=p.side<0?'left':'right';
  const growth=state.branches.find(b=>b.key===key)?.growth||0;
  a.style.opacity=String(Math.max(0,1-growth*5));a.style.visibility=growth>=.2?'hidden':'visible';
  a.style.pointerEvents=growth>=.2?'none':'auto';a.tabIndex=growth>=.2?-1:0;
  placements.push({a,x,y:p.y,align});
  if(growth<.2)include(x-(align==='left'?a.offsetWidth:0)-8,p.y-a.offsetHeight/2-8,a.offsetWidth+16,a.offsetHeight+16);
 }
 for(const [key,links] of leafLinks){
  links.forEach((a,i)=>{
   const p=scene.nodeGeometry(key,i,links.length);
   a.hidden=p.opacity<=0;a.style.width=mobile?'150px':'202px';
   const sprouted=state.stories.some(s=>s.key===a.dataset.route);
   a.style.opacity=String(sprouted?0:p.opacity);a.style.visibility=sprouted?'hidden':'visible';a.tabIndex=sprouted?-1:0;
   const x=p.label?.x||p.x,y=p.label?.y||p.y;
   placements.push({a,x,y,align:'center'});
   if(!a.hidden)include(x-a.offsetWidth/2-8,y-a.offsetHeight/2-8,a.offsetWidth+16,a.offsetHeight+16);
  });
 }
 const articlePlacements=[];
 for(const [key,node] of articleViews){
  if(node.hidden)continue;
  const entry=entries[key],group=entry.parent||'me',item=menus[group]?.items.findIndex(x=>x[1]===key)??-1;
  const width=mobile?w-52:key==='me'?340:440;
  node.style.width=width+'px';
  const footprint=width+(key==='me'&&!mobile?290:0);
  const p=scene.placeStory(key,group,item,footprint,Math.max(node.offsetHeight, key==='me'?500:180)+60);
  if(p){articlePlacements.push({node,p});include(p.x-25,p.y-25,footprint+50,node.offsetHeight+110)}
 }
 const effective=scene.scrollOffset;
 const atDefault=mode==='home'&&state.branches.every(b=>b.growth===0)&&Math.abs(state.camera.x-w*(mobile?.48:.40))+Math.abs(state.camera.y)<.2&&Math.abs(effective.left)+Math.abs(effective.top)<1;
 if(!lastSize||lastSize.w!==w||lastSize.h!==h||atDefault)retainedBounds=null;
 lastSize={w,h};
 if(retainedBounds){bounds={minX:Math.min(bounds.minX,retainedBounds.minX),minY:Math.min(bounds.minY,retainedBounds.minY),maxX:Math.max(bounds.maxX,retainedBounds.maxX),maxY:Math.max(bounds.maxY,retainedBounds.maxY)}}
 retainedBounds={...bounds};
 const origin={left:Math.max(0,Math.ceil(-bounds.minX),Math.ceil(-effective.left)),top:Math.max(0,Math.ceil(-bounds.minY),Math.ceil(-effective.top))};
 const worldWidth=Math.ceil(Math.max(w/scale,bounds.maxX+origin.left,origin.left+effective.left+w/scale));
 const worldHeight=Math.ceil(Math.max(h/scale,bounds.maxY+origin.top,origin.top+effective.top+h/scale));
 world.style.width=worldWidth+'px';world.style.height=worldHeight+'px';
 world.style.transform='scale('+scale+')';
 space.style.width=Math.ceil(worldWidth*scale)+'px';space.style.height=Math.ceil(worldHeight*scale)+'px';
 world.style.minHeight=h+'px';
 scene.setScrollOrigin(origin);
 window.forestRoots?.layout({width:w,camera:state.camera,ground:h-4+state.camera.y,origin});
 for(const p of placements)at(p.a,p.x+origin.left,p.y+origin.top,p.align);
 for(const {node,p} of articlePlacements){node.style.left=(p.x+origin.left)+'px';node.style.top=(p.y+origin.top)+'px';}
 const nextScroll={left:(origin.left+effective.left)*scale,top:(origin.top+effective.top)*scale};
 if(Math.abs(viewport.scrollLeft-nextScroll.left)+Math.abs(viewport.scrollTop-nextScroll.top)>.1)viewport.scrollTo({...nextScroll,behavior:'instant'});
 scene.syncScroll();
 updateTextMask();
}
function go(key){
 if(key===route){if(!key){window.forestScene.setZoom(1);window.forestScene.setView({type:'home',group:'',item:-1});viewport.scrollTo({...window.forestScene.homeScroll,behavior:'smooth'})}return;}
 returnTo=route;
 const hash=key?'#'+key:location.pathname+location.search;
 history.pushState({forest:true},'',hash);
 renderRoute(key);
}
function transformLinks(root){
 root.querySelectorAll('[data-open]').forEach(a=>{const mapped=routeForOpen[a.dataset.open];if(mapped)a.dataset.route=mapped;a.removeAttribute('data-open')});
}
function makePhoto(image){
 if(image.closest('.photo'))return;
 const button=document.createElement('button');button.type='button';button.className='photo';
 button.setAttribute('aria-label','Reveal color: '+(image.alt||'photo'));button.setAttribute('aria-pressed','false');
 image.removeAttribute('id');image.removeAttribute('loading');image.draggable=false;
 const output=document.createElement('canvas');output.setAttribute('aria-hidden','true');
 image.replaceWith(button);button.append(image,output);
 function dither(){
  if(!image.naturalWidth)return;
  const displayWidth=button.clientWidth||440,dpr=Math.min(devicePixelRatio||1,2),dot=4;
  const cols=Math.max(24,Math.round(displayWidth/dot)),rows=Math.max(1,Math.round(cols*image.naturalHeight/image.naturalWidth));
  const sample=document.createElement('canvas');sample.width=cols;sample.height=rows;
  const sc=sample.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0,cols,rows);
  output.width=Math.round(displayWidth*dpr);output.height=Math.round(displayWidth*image.naturalHeight/image.naturalWidth*dpr);
  const c=output.getContext('2d'),stepX=output.width/cols,stepY=output.height/rows;
  try{
   const d=sc.getImageData(0,0,cols,rows).data;
   c.fillStyle='#2a282c';c.fillRect(0,0,output.width,output.height);c.fillStyle='#b8bbc3';
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const i=(y*cols+x)*4,lum=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)/255;
    const radius=Math.sqrt(Math.pow(lum,.9))*Math.min(stepX,stepY)*.68;
    c.beginPath();c.arc((x+.5)*stepX,(y+.5)*stepY,radius,0,Math.PI*2);c.fill();
   }
   button.classList.add('dither-ready');
  }catch{button.classList.add('failed')}
 }
 // Wait for decode so the halftone never samples a blank image.
 const ready=()=>image.decode?image.decode():new Promise((ok,no)=>image.complete?ok():(image.addEventListener('load',ok,{once:true}),image.addEventListener('error',no,{once:true})));
 ready().then(()=>{dither();updateTextMask()},()=>{});
 image.addEventListener('error',()=>button.classList.add('failed'),{once:true});
 button.addEventListener('click',()=>{const on=button.classList.toggle('revealed');button.setAttribute('aria-pressed',String(on));});
}
function initPhotos(root){root.querySelectorAll('img').forEach(makePhoto)}
function aboutPhotos(){
 const collage=document.createElement('aside');collage.className='about-photos';collage.setAttribute('aria-label','A few photos from my life');
 const photos=[['thumbs/selfie.jpg','Arihan on campus'],['thumbs/hockey-IMG_719811.jpg','On the ice'],['thumbs/madison-IMG_7183.jpg','A meal with friends in Madison'],['thumbs/flights-IMG_9357.jpg','A view from the window seat']];
 for(const [src,alt] of photos){const img=document.createElement('img');img.src=src;img.alt=alt;collage.append(img)}
 return collage;
}
async function buildStory(entry){
 const result=document.createDocumentFragment();
 if(entry.kind==='contact'){
  const section=document.createElement('section');
  section.innerHTML='<p>say hello.</p><p>San Francisco/New York</p><p>I’m always happy to talk about machine learning, software, hardware, or something you’re building.</p><p><a href="mailto:apyadav@wisc.edu">apyadav@wisc.edu</a></p><p><a href="https://linkedin.com/in/arihanyadav" target="_blank" rel="noopener noreferrer">linkedin</a> · <a href="https://github.com/Air-crypto" target="_blank" rel="noopener noreferrer">github</a></p><p><a href="assets/arihan-yadav-resume.pdf" target="_blank" rel="noopener noreferrer">my résumé ↗</a></p>';result.append(section);return result;
 }
 const doc=await loadPage(entry.path),all=[...doc.querySelectorAll(entry.selector)];
 const selected=entry.index===undefined?all:[all[entry.index]];
 if(!selected.length||selected.some(x=>!x))throw Error('This branch could not be found.');
 selected.forEach(source=>{
  const section=source.cloneNode(true);
  if(entry.kind==='work'){
   const wrapper=document.createElement('section'),h=document.createElement('h2');
   h.textContent=section.querySelector('.experience-role').textContent;
   const date=document.createElement('p');date.className='story-date';date.textContent=section.querySelector('.experience-date').textContent;
   wrapper.append(h,date,...section.querySelector('.experience-body').children);result.append(wrapper);
  }else{
   if(entry.kind==='about'&&section.id==='aboutMe'){
    section.querySelector('.flex-child:has(#profilePicture)')?.remove();
    section.querySelector('h3')?.remove();
    const h=section.querySelector('h2');if(h)h.textContent="I’m Arihan.";
   }
   result.append(section);
  }
 });
 if(entry.kind==='about')result.append(aboutPhotos());
 return result;
}
// Streaming: wrap words once, then reveal them in reading order after the limb grows.
const streamMedia='button.photo, video, iframe';
let streamRun=0;
function prepareStream(node){
 if(node.dataset.streamReady)return;
 const tokens=[],walker=document.createTreeWalker(node,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(n){
  if(n.nodeType===1){if(n.matches(streamMedia)){tokens.push(n);return NodeFilter.FILTER_REJECT}return n.matches('script,style')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_SKIP}
  return n.textContent.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
 const texts=[];let n;while((n=walker.nextNode()))texts.push(n);
 for(const text of texts){
  // Flex, grid and table drop spaces between items, so keep such text as one token.
  const shown=getComputedStyle(text.parentElement).display;
  if(/flex|grid|table/.test(shown)){const span=document.createElement('span');span.className='s-tok';text.replaceWith(span);span.append(text);continue}
  const frag=document.createDocumentFragment();
  for(const part of text.textContent.split(/(\s+)/)){
   if(!part)continue;
   if(/^\s+$/.test(part)){frag.append(part);continue}
   const span=document.createElement('span');span.className='s-tok';span.textContent=part;frag.append(span);
  }
  text.replaceWith(frag);
 }
 for(const m of tokens)m.classList.add('s-tok');
 // Underlines, bullets and disclosure arrows belong to the parent; reveal it with its first word.
 node.querySelectorAll('a:not(.photo), li, summary').forEach(e=>e.classList.add('s-tok'));
 node.dataset.streamReady='1';
}
function streamStory(key,node){
 const run=++streamRun,scene=window.forestScene;
 prepareStream(node);
 const tokens=[...node.querySelectorAll('.s-tok')];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduce||scene.paused||!tokens.length){tokens.forEach(t=>t.classList.add('s-on'));node.classList.remove('streaming');return}
 tokens.forEach(t=>t.classList.remove('s-on'));node.classList.add('streaming');
 const waitStart=performance.now();
 const per=Math.max(6,Math.min(26,2600/tokens.length));
 let start=0,shown=0;
 function step(now){
  if(run!==streamRun||node.hidden)return;
  if(!start){
   // Hold until the limb reaches the article (or give up after 3 s).
   if(scene.storyProgress(key)<.95&&now-waitStart<3000)return requestAnimationFrame(step);
   start=now;
  }
  const want=Math.min(tokens.length,Math.floor((now-start)/per)+1);
  while(shown<want)tokens[shown++].classList.add('s-on');
  if(shown<tokens.length)requestAnimationFrame(step);else node.classList.remove('streaming');
 }
 requestAnimationFrame(step);
}
function finishStream(node){streamRun++;node.querySelectorAll('.s-tok').forEach(t=>t.classList.add('s-on'));node.classList.remove('streaming')}
async function showStory(key){
 let node=articleViews.get(key);
 if(node){node.hidden=false;streamStory(key,node);return;}
 node=document.createElement('div');node.className='story-entry'+(key==='me'?' about-story':'');node.dataset.story=key;node.tabIndex=-1;
 node.innerHTML='<p>following the branch…</p>';node.setAttribute('aria-busy','true');
 articleViews.set(key,node);story.append(node);new ResizeObserver(layout).observe(node);
 try{
  node.replaceChildren(await buildStory(entries[key]));
  transformLinks(node);initPhotos(node);streamStory(key,node);
  const e=entries[key];
  if(e.parent&&menus[e.parent]){
   const trail=document.createElement('p'),up=document.createElement('a');trail.className='story-trail';
   up.href=hrefFor(e.parent);up.dataset.route=e.parent;up.textContent=menus[e.parent].label;
   trail.append(up,document.createTextNode(' / '+e.title));node.prepend(trail);
  }
 }catch{
  node.innerHTML='<p>This branch could not load.</p>';
  const retry=document.createElement('button');retry.className='retry';retry.textContent='try again';
  retry.addEventListener('click',()=>{articleViews.delete(key);node.remove();showStory(key)});
  const fallback=document.createElement('a');fallback.href=entries[key].path;fallback.textContent='open the original page ↗';
  node.append(retry,document.createTextNode(' · '),fallback);
 }finally{node.removeAttribute('aria-busy');if(!node.hidden)layout()}
}
async function renderRoute(raw){
 const key=aliases[raw]||raw;
 if(key&&!menus[key]&&!entries[key]){history.replaceState(null,'',location.pathname+location.search);return renderRoute('')}
 const id=++request;route=key;
 document.title=key?(menus[key]?.label||entries[key]?.title)+' · Arihan Yadav':'Arihan Yadav';
 story.querySelectorAll('video').forEach(v=>v.pause());
 mode=!key?'home':menus[key]?'menu':'story';
 document.body.dataset.mode=mode;if(key)document.body.classList.add('explored');
 const group=mode==='home'?'':menus[key]?key:entries[key].parent||'me';
 activeMenu=menus[group]||null;
 for(const [id,node] of articleViews){const hide=mode!=='story'||id!==key;if(hide&&!node.hidden)finishStream(node);node.hidden=hide}
 story.hidden=mode!=='story';story.className='';
 document.getElementById('return-hint').hidden=!key;
 if(mode==='home')window.forestScene.setZoom(1);
 back.hidden=!key;back.setAttribute('aria-label','Return to the default tree');
 for(const a of nav.querySelectorAll('.branch-link')){
  const selected=a.dataset.route===key;
  a.classList.toggle('selected',selected);
  if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 }
 window.forestScene.setView({type:mode,key,group,count:activeMenu?.items.length||0,item:activeMenu?.items.findIndex(x=>x[1]===key)??-1});
 viewport.scrollTo({...window.forestScene.homeScroll,behavior:'instant'});window.forestScene.syncScroll();
 if(mode==='story')await showStory(key);
 if(id!==request)return;
 layout();
 if(keyboardNavigation&&mode==='story')articleViews.get(key)?.focus({preventScroll:true});
 else if(keyboardNavigation&&returnTo)primaryLinks.get(returnTo.split('/')[0])?.focus({preventScroll:true});
}
let keyboardNavigation=false;
document.addEventListener('click',event=>{
 const a=event.target.closest('[data-route]');
 if(a){
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();keyboardNavigation=event.detail===0;
  go(aliases[a.dataset.route]||a.dataset.route);return;
 }
 const scene=window.forestScene,origin=scene.scrollOrigin,scale=scene.zoom;
 if((!route&&scale===1&&Math.abs(viewport.scrollTop-origin.top)+Math.abs(viewport.scrollLeft-origin.left)<1)||event.target.closest('a,button,summary,input,select,textarea,video,iframe,.music')||window.getSelection()?.toString())return;
 const bounds=viewport.getBoundingClientRect(),x=(event.clientX-bounds.left)/scale,y=(event.clientY-bounds.top+viewport.scrollTop)/scale-origin.top;
 if(textHitAreas.some(a=>x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h))return;
 if(event.target.closest('#forest-viewport')||event.target===document.body){keyboardNavigation=false;go('')}
});
document.getElementById('return-hint').addEventListener('click',()=>go(''));
back.addEventListener('click',event=>{keyboardNavigation=event.detail===0;go('')});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&(route||window.forestScene.zoom!==1)&&!event.target.closest('.music')){event.preventDefault();keyboardNavigation=true;go('')}
});
window.addEventListener('popstate',()=>renderRoute(location.hash.slice(1)));
window.addEventListener('hashchange',()=>{if(location.hash.slice(1)!==route)renderRoute(location.hash.slice(1))});
window.addEventListener('forest-resize',()=>{layout();viewport.scrollTo({...window.forestScene.homeScroll,behavior:'instant'});window.forestScene.syncScroll()});
new ResizeObserver(layout).observe(story);
new ResizeObserver(updateTextMask).observe(nav);
document.fonts.ready.then(()=>{layout();updateTextMask()});
story.addEventListener('toggle',updateTextMask,true);
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();nav.focus({preventScroll:true})});
createNavigation();
window.forestScene.onLayout(layout);
viewport.addEventListener('scroll',()=>{if(mode==='home')layout();else updateTextMask()},{passive:true});
// Deep links: settle the home tree first, then grow the linked branch as a click would.
const initialRoute=location.hash.slice(1);
renderRoute('');
if(initialRoute)document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{if(location.hash.slice(1)===initialRoute)renderRoute(initialRoute)})));
})();
