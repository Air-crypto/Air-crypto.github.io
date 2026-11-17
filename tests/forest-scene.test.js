ObjC.import('Foundation');
function run(){
 const source=$.NSString.stringWithContentsOfFileEncodingError($.NSFileManager.defaultManager.currentDirectoryPath.js+'/forest-scene.js',4,null).js;
 const results=[];
 function assert(ok,message){if(!ok)throw new Error(message)}
 for(const dims of [[1250,540],[302,856]]){
  let time=0,serial=0;const pending=new Map();
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});
  const canvas={width:0,height:0,style:{},getContext:()=>context};
  const viewport={clientWidth:dims[0],clientHeight:dims[1],scrollTop:0,scrollLeft:0,addEventListener(){}};
  const motion={addEventListener(){},setAttribute(){}};
  const document={hidden:false,getElementById:id=>id==='landscape'?canvas:id==='forest-viewport'?viewport:motion,createElement:()=>({width:0,height:0,getContext:()=>context}),addEventListener(){}};
  const window={dispatchEvent(){}},devicePixelRatio=1;
  const matchMedia=()=>({matches:false,addEventListener(){}});
  const requestAnimationFrame=cb=>{const id=++serial;pending.set(id,cb);return id};
  const cancelAnimationFrame=id=>pending.delete(id);
  const ResizeObserver=function(cb){this.observe=()=>cb()};
  const CustomEvent=function(){};
  new Function('document','window','devicePixelRatio','matchMedia','requestAnimationFrame','cancelAnimationFrame','ResizeObserver','CustomEvent',source)(document,window,devicePixelRatio,matchMedia,requestAnimationFrame,cancelAnimationFrame,ResizeObserver,CustomEvent);
  const scene=window.forestScene;
  function advance(frames){for(let i=0;i<frames;i++){time+=34;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(cb=>cb(time))}}
  function attached(key){const a=scene.primaryGeometry(key),b=scene.branchPoint(key,0);assert(Math.hypot(a.x-b.x,a.y-b.y)<.00001,'Branch detached from its original twig')}
  advance(2);
  const camera=scene.state.camera;
  scene.setView({type:'menu',group:'projects',count:11,item:-1});
  assert(scene.state.camera.x===camera.x&&scene.state.camera.y===camera.y,'Opening a branch teleported the camera');
  advance(15);attached('projects');
  const partial=scene.state.branches.find(b=>b.key==='projects').growth;
  assert(partial>0&&partial<1,'Branch did not progressively grow');
  scene.setView({type:'story',group:'projects',count:11,item:6});
  assert(scene.state.branches.find(b=>b.key==='projects').growth===partial,'Opening an article restarted its limb');
  advance(55);attached('projects');
  assert(scene.bounds.minY<0,'Opening content did not expand bounds above the viewport');
  assert(scene.state.branches.find(b=>b.key==='projects').growth===1,'Parent branch failed to finish growing');
  scene.setView({type:'menu',group:'life',count:7,item:-1});
  assert(scene.state.branches.find(b=>b.key==='projects').growth===1,'Another limb erased the existing project branch');
  advance(55);attached('life');attached('projects');
  scene.setView({type:'home',group:'',count:0,item:-1});
  advance(90);
  assert(scene.state.branches.every(b=>b.growth===0&&!b.open),'Reset failed to retract expanded branches');
  assert(Math.abs(scene.state.camera.y)<.1,'Reset failed to return the ground');
  assert(scene.size.rootDepth===1800,'Deep scrollable roots were lost');
  assert(scene.bounds.maxY>=dims[1]+1700,'Root bounds cannot be reached by scrolling');
  assert(document.getElementById('landscape')===canvas,'Landscape canvas was replaced');
  results.push(dims.join('x')+': connected branches, continuous camera, no growth restart, retained limbs, reset, deep roots PASS');
 }
 return results.join('\n');
}
