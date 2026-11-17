(() => {
'use strict';
const viewport=document.getElementById('forest-viewport'),world=document.getElementById('world');
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
const entries={};
[
['amd',0,'AMD · language models'],['amd-intern',1,'AMD · hardware traces'],['arlis',2,'ARLIS'],['research',3,'UW–Madison'],['theom',4,'Theom'],['robotics',5,'Wisconsin Robotics']
].forEach(([key,index,title])=>entries['work/'+key]={path:'portfolio.html#experience',selector:'.experience-entry',index,title,parent:'work',kind:'work'});
[
['simd',0,'VLIW / SIMD','systems'],['ebike',1,'eBike controller','systems'],['quantum',2,'quantum error mitigation','ml'],['kernel',3,'kernel scheduler','systems'],['guitar',4,'guitar tuner','systems'],['gradients',5,'gradient descent','ml'],['led',6,'LED controller','systems'],['acoustic',7,'acoustic keylogging','ml'],['video',8,'video understanding','ml'],['asl',9,'ASL translator','ml'],['website',10,'this website','']
].forEach(([key,index,title,group])=>entries['projects/'+key]={path:'projects.html',selector:'body > section',index,title,parent:group?'projects/'+group:'projects',kind:'project'});
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
const aliases={about:'me',experience:'work',studentlife:'me',hardware:'projects/systems',littlethings:'life/little',flights:'life/flights',madison:'life/madison',aurora:'life/aurora',eclipse:'life/eclipse',sanfrancisco:'life/sf',skating:'life/skating',gallery:'life',swimming:'life/madison'};
const routeForOpen={about:'me',experience:'work',projects:'projects',life:'life',contact:'contact',studentlife:'me',hardware:'projects/systems',littlethings:'life/little',flights:'life/flights',madison:'life/madison',aurora:'life/aurora',eclipse:'life/eclipse',sanfrancisco:'life/sf',skating:'life/skating',gallery:'life',swimming:'life/madison'};
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
let maskFrame=0;
function updateTextMask(){
 cancelAnimationFrame(maskFrame);
 maskFrame=requestAnimationFrame(()=>{
  const origin=viewport.getBoundingClientRect(),areas=[];
  for(const root of [nav,story]){
   if(root.hidden)continue;
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   let node;while((node=walker.nextNode())){
    if(!node.textContent.trim()||node.parentElement.closest('button.photo, .about-photos, details:not([open]) > :not(summary)'))continue;
    const range=document.createRange();range.selectNodeContents(node);
    for(const box of range.getClientRects())if(box.width&&box.height)areas.push({x:box.left-origin.left,y:box.top-origin.top+viewport.scrollTop,w:box.width,h:box.height});
   }
  }
  window.forestScene.setTextAreas(areas);
 });
}
function layout(){
 const {width:w,height:h}=window.forestScene.size;if(!w||!h)return;
 const mobile=w<700;
 world.style.minHeight=h+'px';
 if(mode==='home'){
  const s=h*.82/990,sx=mobile?Math.min(s,w*.72/600):s*1.55,cx=w*(mobile?.48:.40),root=h-4;
  const specs=[['work',150,241,-1],['projects',450,323,1],['life',120,477,-1],['me',447,565,1]];
  for(const [key,x,y,side] of specs){const a=nav.querySelector('[data-route="'+key+'"]');at(a,cx+(x-300)*sx+side*10,root-(1050-y)*s,side<0?'left':'right')}
 }else if(mode==='menu'){
  [...nav.querySelectorAll('.branch-leaf')].forEach((a,i)=>{
   const p=window.forestScene.nodeGeometry(i,activeMenu.items.length);
   at(a,p.x+p.side*(mobile?17:30),p.y-15,p.side<0?'left':'right');
  });
  const title=nav.querySelector('.selected');
  if(title)at(title,mobile?w*.5:w*(activeMenu.side>0?.34:.66),mobile?35:h*.96,mobile?'center':activeMenu.side>0?'left':'right');
 }else{
  const parent=nav.querySelector('.selected');
  if(parent)at(parent,w*(mobile?.16:.20),mobile?118:h*.35,'right');
 }
 updateTextMask();
}
function go(key){
 if(key===route)return;
 returnTo=route;
 const hash=key?'#'+key:location.pathname+location.search;
 history.pushState({forest:true},'',hash);
 renderRoute(key);
}
function parentOf(key){return menus[key]?.parent??entries[key]?.parent??''}
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
  const width=Math.min(680,Math.max(200,Math.round((button.clientWidth||440)*1.4)));
  const height=Math.round(width*image.naturalHeight/image.naturalWidth);
  output.width=width;output.height=height;
  const c=output.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,width,height);
  try{
   const pixels=c.getImageData(0,0,width,height),d=pixels.data;
   const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,lum=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)/255;
    const on=Math.pow(lum,.86)>(bayer[(y%4)*4+x%4]+.5)/16;
    d[i]=on?184:42;d[i+1]=on?187:40;d[i+2]=on?195:44;d[i+3]=255;
   }
   c.putImageData(pixels,0,0);button.classList.add('dither-ready');
  }catch{button.classList.add('failed')}
 }
 if(image.complete)dither();else image.addEventListener('load',()=>{dither();updateTextMask()},{once:true});
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
async function renderRoute(raw){
 const key=aliases[raw]||raw;
 const valid=!key||menus[key]||entries[key];
 if(!valid){history.replaceState(null,'',location.pathname+location.search);return renderRoute('')}
 const id=++request;route=key;document.title=key?(menus[key]?.label||entries[key]?.title)+' · Arihan Yadav':'Arihan Yadav';
 story.querySelectorAll('video').forEach(v=>v.pause());
 viewport.scrollTop=0;nav.replaceChildren();story.replaceChildren();story.hidden=true;story.className='';
 back.hidden=!key;
 if(!key){
  mode='home';activeMenu=null;
  window.forestScene.setView({type:'home',side:1,count:0});
  [['my work','work'],['projects','projects'],['life','life'],['me','me']].forEach(([label,id])=>nav.append(link(label,id)));
 }else if(menus[key]){
  mode='menu';activeMenu=menus[key];
  window.forestScene.setView({type:'menu',side:activeMenu.side,count:activeMenu.items.length});
  nav.append(link(activeMenu.label+'.',activeMenu.parent,true));
  activeMenu.items.forEach(([label,id],i)=>{const a=link(label,id);a.classList.add('branch-leaf');a.style.setProperty('--appear',(.18+i/activeMenu.items.length*.95)+'s');nav.append(a)});
 }else{
  mode='story';activeMenu=null;const entry=entries[key];
  window.forestScene.setView({type:'story',side:1,count:0});
  nav.append(link((menus[entry.parent]?.label||entry.title)+'.',entry.parent,true));
  story.hidden=false;story.className=entry.kind==='about'?'about-story':'';
  story.setAttribute('aria-busy','true');story.innerHTML='<p>following the branch…</p>';
  try{
   const content=await buildStory(entry);if(id!==request)return;
   story.replaceChildren(content);
   transformLinks(story);initPhotos(story);
   // A quiet route back is part of the branch, never a separate panel or tab bar.
  }catch(error){
   if(id!==request)return;
   story.innerHTML='<p class="story-error">This branch could not load.</p>';
   const retry=document.createElement('button');retry.className='retry';retry.textContent='try again';retry.addEventListener('click',()=>renderRoute(route));
   const fallback=document.createElement('a');fallback.href=entry.path;fallback.textContent='open the original page ↗';
   story.append(retry,document.createTextNode(' · '),fallback);
  }finally{if(id===request)story.removeAttribute('aria-busy')}
 }
 if(id!==request)return;
 layout();
 if(returnTo&&mode!=='story'){
  const focus=nav.querySelector('[data-route="'+returnTo+'"]');
  if(focus&&keyboardNavigation)focus.focus({preventScroll:true});
 }
}
let keyboardNavigation=false;
document.addEventListener('click',event=>{
 const a=event.target.closest('[data-route]');
 if(!a||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();keyboardNavigation=event.detail===0;go(a.dataset.route);
});
back.addEventListener('click',event=>{keyboardNavigation=event.detail===0;go(parentOf(route))});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&route&&!event.target.closest('.music')){event.preventDefault();keyboardNavigation=true;go(parentOf(route))}
});
window.addEventListener('popstate',()=>renderRoute(location.hash.slice(1)));
window.addEventListener('hashchange',()=>{if(location.hash.slice(1)!==route)renderRoute(location.hash.slice(1))});
window.addEventListener('forest-resize',layout);
new ResizeObserver(updateTextMask).observe(story);
new ResizeObserver(updateTextMask).observe(nav);
document.fonts.ready.then(()=>{layout();updateTextMask()});
story.addEventListener('toggle',updateTextMask,true);
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();nav.focus({preventScroll:true})});
renderRoute(location.hash.slice(1));
})();
