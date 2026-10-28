import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../public/everstory.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function syncStoryUrl(){'),source.indexOf('function resetPracticeView(){'));
test('changing practice language survives reload and preserves campaign attribution',()=>{
 let saved;const values=new Map();const state={URLSearchParams,location:{pathname:'/experience',search:'?lang=en&character=noah&mode=practice&target=ko&utm_source=launch_x',hash:''},history:{replaceState:(_,__,url)=>saved=url},localStorage:{setItem:(k,v)=>values.set(k,v)},entryParams:new URLSearchParams(),activeChar:{id:'noah'},current:'ko',practice:true,practiceTarget:'en',practiceLevel:'standard'};
 vm.runInNewContext(fn+'syncStoryUrl()',state);const result=new URL(saved,'https://example.test');assert.equal(result.searchParams.get('target'),'en');assert.equal(result.searchParams.get('lang'),'ko');assert.equal(result.searchParams.get('level'),'standard');assert.equal(result.searchParams.get('utm_source'),'launch_x');assert.equal(state.entryParams.get('target'),'en');assert.equal(values.get('everstory-mode:noah'),'practice');
 state.practice=false;state.activeChar={id:'kael'};state.current='ja';state.location.search=result.search;vm.runInNewContext(fn+'syncStoryUrl()',state);const regular=new URL(saved,'https://example.test');assert.equal(regular.searchParams.get('character'),'kael');assert.equal(regular.searchParams.get('lang'),'ja');for(const key of ['mode','target','level'])assert.equal(regular.searchParams.has(key),false);assert.equal(regular.searchParams.get('utm_source'),'launch_x');
});
