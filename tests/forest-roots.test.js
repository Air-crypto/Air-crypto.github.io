ObjC.import('Foundation');
function run(){
 const source=$.NSString.stringWithContentsOfFileEncodingError($.NSFileManager.defaultManager.currentDirectoryPath.js+'/forest-roots.js',4,null).js;
 function assert(ok,message){if(!ok)throw Error(message)}
 const buttons=[];let wakes=0;
 const world={append:b=>buttons.push(b)};
 const document={getElementById:()=>world,createElement:()=>({style:{},attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,v){this.events[k]=v}})};
 const window={forestScene:{wake(){wakes++}}};
 new Function('document','window',source)(document,window);
 const roots=window.forestRoots;
 assert(buttons.length===3&&buttons.every(b=>b.attrs['aria-label']&&!b.textContent),'Root memories need accessible names without visible labels');
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{
  get:(o,k)=>k in o?o[k]:(...args)=>{assert(args.every(a=>typeof a!=='number'||Number.isFinite(a)),'Nonfinite drawing coordinate')},
  set:(o,k,v)=>(o[k]=v,true)
 });
 const draw=(width,paused=false)=>roots.draw(context,{width,height:540,camera:{x:width*.4,y:0},ground:536,scroll:700,clock:1,paused});
 roots.tick(0,false);buttons[0].events.pointerenter({pointerType:'touch'});
 assert(roots.state.every(m=>!m.found),'Touch scrolling revealed a memory');
 buttons[0].events.click();assert(roots.state[0].found&&roots.moving&&wakes===1,'Tap did not start discovery');
 roots.tick(.35,false);const reveal=roots.state[0].reveal;
 assert(reveal>0&&reveal<1,'Drawing does not progressively appear');draw(1250);
 buttons[0].events.click();assert(roots.state[0].reveal===reveal,'Replay erased the existing drawing');
 for(let i=0;i<100;i++)roots.tick(.04,false);
 assert(roots.state[0].reveal===1&&roots.state[0].pulse===1&&!roots.moving,'Root pulse failed to settle');
 buttons[1].events.focus();assert(roots.state[1].found,'Keyboard focus did not discover hockey');
 roots.tick(0,true);draw(302,true);buttons[2].events.click();
 assert(roots.state.every(m=>m.reveal===1&&m.pulse===1),'Paused/reduced-motion discovery animated');
 for(const width of [302,1250]){
  const camera={x:width*.48,y:-100},origin={left:350,top:250};
  roots.layout({width,camera,ground:440,origin});
  for(const b of buttons){const x=parseFloat(b.style.left)-origin.left,y=parseFloat(b.style.top)-origin.top;
   assert(x-40>=0&&x+40<=width,'Memory tap target leaves the home viewport');
   assert(y>440&&y+60<440+1800,'Memory exceeds scrollable root bounds');
  }
  draw(width,true);
 }
 assert(roots.state.every(m=>m.found),'Resize or drawing lost discoveries');
 return 'PASS: hidden accessible targets, touch versus hover, progressive discovery, replay, keyboard, reduced motion, mobile geometry, persistent discoveries';
}
