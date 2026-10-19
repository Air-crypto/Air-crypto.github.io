const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('./calendar.js');
const item = overrides => ({ id:'sample', title:'Sample', date:'2026-10-19', start:'11:30', end:'11:50', kind:'interview', ...overrides });
test('seven days start today and preserve actual recorded duration', () => {
 const w=C.weekModel('2026-10-19',[item()]);assert.equal(w.days.length,7);assert.equal(w.days[6].date,'2026-10-25');
 assert.equal(w.days[0].bars[0].end-w.days[0].bars[0].start,20);
});
test('overlap lanes handle nesting, transitive groups and touching endpoints',()=>{
 const r=C.layoutIntervals([{start:0,end:90},{start:30,end:60},{start:50,end:120},{start:120,end:180}]);
 assert.deepEqual(r.map(i=>i.lanes),[3,3,3,1]);assert.equal(r[3].lane,0);
 for(let n=0;n<r.length;n++)for(let m=n+1;m<r.length;m++)if(r[n].start<r[m].end&&r[m].start<r[n].end)assert.notEqual(r[n].lane,r[m].lane);
});
test('deadlines and unknown ends are points without fabricated duration',()=>{
 const d=C.dayModel('2026-10-19',[item({kind:'assignment',start:'16:00',end:null}),item({id:'unknown',end:null})]);
 assert.equal(d.bars.length,0);assert.deepEqual(d.points.map(p=>p.type),['deadline','unknown']);
 assert.ok(d.points.every(p=>!('end'in p)));
});
test('simultaneous points use separate lanes',()=>{
 const d=C.dayModel('2026-10-19',[item({end:null}),item({id:'other',end:null})]);
 assert.deepEqual(d.points.map(p=>[p.lane,p.lanes]),[[0,2],[1,2]]);
});
test('all-day and time-unspecified entries have distinct labels',()=>{
 const d=C.dayModel('2026-10-19',[item({start:null,end:null}),item({id:'all',start:null,end:null,allDay:true})]);
 assert.deepEqual(d.allDay.map(x=>x.label),['Time not specified','All day']);assert.equal(d.bars.length,0);
});
test('overnight duration is split at true Chicago midnight',()=>{
 const i=item({start:'23:30',end:'00:30'}),a=C.dayModel('2026-10-19',[i]),b=C.dayModel('2026-10-20',[i]);
 assert.equal(a.bars[0].end-a.bars[0].start,30);assert.equal(b.bars[0].end-b.bars[0].start,30);
 assert.equal(a.bars[0].continuesAfter,true);assert.equal(b.bars[0].continuesBefore,true);
});
test('DST day lengths and bars use real elapsed minutes, including repeated hours',()=>{
 const fall=C.dayModel('2026-11-01',[item({date:'2026-11-01',start:'00:30',end:'02:30'})]);
 assert.equal(fall.minutes,1500);assert.equal(fall.bars[0].end-fall.bars[0].start,180);
 assert.match(fall.ticks[1].label,/1:00 AM CDT/);assert.match(fall.ticks[2].label,/1:00 AM CST/);
 const spring=C.dayModel('2026-03-08',[item({date:'2026-03-08',start:'01:30',end:'03:30'})]);
 assert.equal(spring.minutes,1380);assert.equal(spring.bars[0].end-spring.bars[0].start,60);
 assert.match(spring.ticks[2].label,/3:00 AM CDT/);
});
