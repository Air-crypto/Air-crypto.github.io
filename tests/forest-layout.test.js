ObjC.import('Foundation');
function run(){
 const source=$.NSString.stringWithContentsOfFileEncodingError($.NSFileManager.defaultManager.currentDirectoryPath.js+'/forest-layout.js',4,null).js;
 const window={};new Function('window',source)(window);
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
 let cases=0;
 for(const width of [320,1250])for(let seed=1;seed<=6;seed++){
  let randomState=seed;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296};
  const p=window.createForestLayout({random}),fingerprints=[];
  for(const [key,side,down,count] of [['projects',1,-1,11],['work',-1,-1,7],['life',-1,1,7],['me',1,1,0]]){
   const base={x:0,y:230},label={x:side*110,y:230+down*80};
   const b=p.openBranch({key,base,label,side,down,count,width,height:700});
   assert(Math.hypot(b.point(0).x-base.x,b.point(0).y-base.y)<.001,'Limb no longer begins at the trunk');
   assert(Math.sign(b.point(1).y-label.y)===down,'Primary growth ignored upper/lower direction');
   assert(p.openBranch({key})===b,'Revisiting a branch regenerated it');
   for(const a of b.nodes)for(const n of b.nodes)if(a!==n)assert(!overlap(a.box,n.box),'Sibling labels overlap');
   fingerprints.push(b.point(1).x+','+b.point(1).y);
  }
  for(const [key,group,item] of [['first','projects',0],['second','projects',1],['third','life',3],['fourth','me',-1]]){
   const article=p.placeStory({key,group,item,width:width<700?268:440,height:700+(item+1)*120});
   const b=p.branches.get(group),node=b.nodes[item]||{y:b.label.y,direction:{y:b.down}};
   assert(node.direction.y<0?article.rect.y+article.rect.h<node.y:article.rect.y>node.y,'Article grew against its label direction');
   for(const other of p.stories.values())if(other!==article)assert(!overlap(article.rect,other.rect),'Articles overlap');
   assert(p.placeStory({key,group,item,width:article.rect.w,height:article.rect.h})===article,'Stable article was reallocated');
  }
  const first=p.stories.get('first');
  p.placeStory({key:'first',group:'projects',item:0,width:first.rect.w,height:first.rect.h+1400});
  for(const a of p.stories.values())for(const b of p.stories.values())if(a!==b)assert(!overlap(a.rect,b.rect),'Late media growth covers another article');
  assert(p.branches.size===4&&p.stories.size===4,'Later interactions closed earlier content');
  p.reset();assert(!p.branches.size&&!p.stories.size,'Reset retained old geometry');
  const b=p.openBranch({key:'projects',base:{x:0,y:230},label:{x:110,y:150},side:1,down:-1,count:11,width,height:700});
  assert(b.point(1).x+','+b.point(1).y!==fingerprints[0],'Fresh interaction reused predetermined geometry');
  cases++;
 }
 return 'PASS: '+cases+' desktop/mobile randomized worlds; directional growth, trunk attachment, persistent branches/articles, collision avoidance, late media resize, fresh layouts';
}
