const { test } = require('node:test');
const assert = require('node:assert/strict');
const P=require('./prompt.js');
const item=o=>({title:'Sample knowledge entry',kind:'assignment',course:'SAMPLE101',date:'2026-10-20',start:'16:00',end:null,note:'Read chapter 2.',desc:'Respond to the reading.',url:'https://example.test/courses/123/assignments/456?exact=1&keep=2',...o});
test('prompt preserves exact URL, title, date, details and Chicago time',()=>{
 const i=item(),p=P.itemPrompt(i);for(const v of [i.title,i.date,i.desc,i.note,i.url,'America/Chicago'])assert.ok(p.includes(v));
 assert.match(p,/Do not submit, post, upload, send, or change anything in Canvas/);
});
test('missing source stays missing instead of guessing a Canvas link',()=>{
 const p=P.itemPrompt(item({url:null}));assert.match(p,/No exact item source URL is recorded/);assert.doesNotMatch(p,/canvas\.[a-z]+\.edu/);
});
test('no-AI restrictions propagate across the same course and override drafting',()=>{
 const rule=item({desc:'Write in your own words: no AI, translation, or grammar-rewriting tools.'});
 const p=P.itemPrompt(item(),[rule]);assert.ok(p.includes(rule.desc));assert.match(p,/Do not draft, rewrite, translate, proofread/);assert.doesNotMatch(p,/prepare a draft reply/);
 const other=P.itemPrompt(item({course:'OTHER'}),[rule]);assert.match(other,/If permitted/);
});
test('long prompts and exact existing knowledge-entry sources are never truncated',()=>{
 const i=item({desc:'Long detail. '.repeat(600)});assert.ok(P.itemPrompt(i).includes(i.desc));assert.ok(P.itemPrompt(i).includes(i.url));
 const data=require('./data.json'),ke=data.items.find(i=>i.title==='Knowledge Entry 13');assert.ok(ke&&ke.url);assert.ok(P.itemPrompt(ke,data.items).includes(ke.url));
});
test('email prompt uses only its existing fields and exact source',()=>{
 const e={subject:'Sample',from:'Example',summary:'Existing summary',url:'https://example.test/message/123'};const p=P.mailPrompt(e);assert.ok(p.includes(e.url));assert.match(p,/Do not send messages/);
});

test('an existing email source is preserved when no item URL is recorded',()=>{
 const i=item({url:null,email:'https://example.test/email/existing'});assert.ok(P.itemPrompt(i).includes(i.email));
});
