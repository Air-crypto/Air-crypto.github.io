ObjC.import('Foundation');
function run(){
 const source=$.NSString.stringWithContentsOfFileEncodingError($.NSFileManager.defaultManager.currentDirectoryPath.js+'/forest-zoom.js',4,null).js;
 const handlers={},changes=[];let now=1000;
 const viewport={clientHeight:600,getBoundingClientRect:()=>({left:14,top:13,width:1000,height:600}),addEventListener:(name,fn,options)=>{if(options.passive!==false)throw Error('Pinch must be cancelable');handlers[name]=fn}};
 const scene={zoom:1,setZoom(value,x,y){this.zoom=value;changes.push({value,x,y})}};
 new Function('document','window','performance',source)({getElementById:()=>viewport},{forestScene:scene},{now:()=>now});
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 function fire(name,data={}){const e={clientX:314,clientY:213,preventDefault(){this.prevented=true},...data};handlers[name](e);return e}
 assert(!fire('wheel',{ctrlKey:false,deltaY:100}).prevented&&changes.length===0,'Ordinary scrolling was blocked');
 const wheel=fire('wheel',{ctrlKey:true,deltaY:80,deltaMode:0});
 assert(wheel.prevented&&scene.zoom<1,'Trackpad wheel zoom failed');
 assert(changes[0].x===300&&changes[0].y===200,'Wheel anchor was not viewport-relative');
 scene.zoom=1;fire('gesturestart');fire('gesturechange',{scale:.55});
 assert(scene.zoom===.55,'Safari pinch-out scale is wrong');
 fire('gesturechange',{scale:.8});assert(scene.zoom===.8,'Safari scale compounded between events');
 const count=changes.length;fire('wheel',{ctrlKey:true,deltaY:80,deltaMode:0});
 assert(changes.length===count,'A duplicate wheel event doubled the pinch');
 fire('gestureend');fire('wheel',{ctrlKey:true,deltaY:80,deltaMode:0});
 assert(changes.length===count,'Gesture tail doubled the pinch');
 now+=200;fire('wheel',{ctrlKey:true,deltaY:-80,deltaMode:0});
 assert(scene.zoom>.8,'Zoom-in after a completed gesture failed');
 return 'Safari gesture lifecycle, ctrl-wheel zoom, pointer anchor, ordinary scroll and duplicate suppression PASS';
}