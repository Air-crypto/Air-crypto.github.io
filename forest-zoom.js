/* Trackpad pinch zoom: WebKit gestures plus ctrl-wheel in Chromium/Firefox. */
(() => {
'use strict';
const viewport=document.getElementById('forest-viewport'),scene=window.forestScene;
let gestureStart=null,lastGestureEnd=-Infinity;
const point=e=>{const b=viewport.getBoundingClientRect();return {
 x:Number.isFinite(e.clientX)?e.clientX-b.left:b.width/2,
 y:Number.isFinite(e.clientY)?e.clientY-b.top:b.height/2
}};
viewport.addEventListener('wheel',e=>{
 if(!e.ctrlKey)return;
 e.preventDefault();
 // Some browsers emit both event families for the same physical gesture.
 if(gestureStart!==null||performance.now()-lastGestureEnd<180)return;
 const p=point(e),unit=e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1;
 scene.setZoom(scene.zoom*Math.exp(-e.deltaY*unit*.006),p.x,p.y);
},{passive:false});
viewport.addEventListener('gesturestart',e=>{
 e.preventDefault();gestureStart=scene.zoom;
},{passive:false});
viewport.addEventListener('gesturechange',e=>{
 e.preventDefault();
 if(gestureStart===null||!Number.isFinite(e.scale)||e.scale<=0)return;
 const p=point(e);scene.setZoom(gestureStart*e.scale,p.x,p.y);
},{passive:false});
viewport.addEventListener('gestureend',e=>{
 e.preventDefault();gestureStart=null;lastGestureEnd=performance.now();
},{passive:false});
})();