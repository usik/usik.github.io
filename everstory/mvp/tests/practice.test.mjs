import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {handle} from '../lib/api.mjs';
import {validateHelp} from '../lib/practice.mjs';
const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role;');
for(const file of ['001_everstory.sql','002_scene_visuals.sql','practice-schema.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
const env={SERVICE_ENABLED:'true',SUPABASE_URL:'https://db.test',SUPABASE_SERVICE_ROLE_KEY:'test-secret',GEMINI_API_KEY:'test-only',PUBLIC_ORIGIN:'https://test.local'};
let calls=0,lastModel,broken=false;
const scene=language=>({scene:language==='en'?'Nox watches the gate. “Stay close. Are you ready?”':'녹스가 성문을 바라봐요. “제 곁에 있어요. 준비됐어요?”',choices:language==='en'?['Ask about the gate.','Follow Nox.','Look at the mark.']:['성문에 대해 물어봐요.','녹스를 따라가요.','손의 문양을 살펴봐요.'],summary:'The visitor meets Nox at the gate.',state:{visual:'neutral',location:'gate',relationship:'new ally',openThreads:['the mark']}});
async function fetcher(url,opts){
 const u=new URL(url),body=opts.body?JSON.parse(opts.body):null;
 if(u.hostname==='generativelanguage.googleapis.com'){
  calls++;lastModel=body;if(broken)return new Response('{}',{status:503});
  const props=body.generationConfig.responseJsonSchema.properties,system=body.systemInstruction.parts[0].text;
  const output=props.sceneMeaning?{sceneMeaning:'녹스가 문을 바라봐요. 곁에 있어요.',choiceMeanings:['문에 대해 물어봐요.','따라가요.','문양을 봐요.']}:props.suggestion?{suggestion:'I am scared, but I will follow you.',explanation:'Use scared for the feeling.',changed:true}:scene(system.includes('entirely in ko')?'ko':'en');
  return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(output)}]}}]});
 }
 const table=u.pathname.replace('/rest/v1/','');if(table.startsWith('rpc/')){const fn=table.slice(4);assert.match(fn,/^everstory_[a-z_]+$/);const keys=Object.keys(body);const r=await db.query('select '+fn+'('+keys.map((k,i)=>k+'=>$'+(i+1)).join(',')+') as result',keys.map(k=>typeof body[k]==='object'?JSON.stringify(body[k]):body[k]));return Response.json(r.rows[0].result??null);}
 assert.match(table,/^everstory_(practice_(stories|turns|help)|stories|turns)$/);
 const p=u.searchParams,where=[],values=[];for(const k of ['owner_id','language','character_id','version'])if(p.has(k)){values.push(p.get(k).slice(3));where.push(k+'=$'+values.length);}const condition=where.length?' where '+where.join(' and '):'';
 if(opts.method==='DELETE'){await db.query('delete from '+table+condition,values);return new Response(null,{status:204});}
 const select=p.get('select')||'*';assert.match(select,/^[a-z_,*]+$/);const order=p.get('order');assert.ok(!order||['version.desc','updated_at.desc','created_at.asc'].includes(order));
 const rows=await db.query('select '+select+' from '+table+condition+(order?' order by '+order.replace('.',' '):'')+' limit '+Number(p.get('limit')||500)+' offset '+Number(p.get('offset')||0),values);return Response.json(rows.rows);
}
const user={userId:'practice-A',displayName:'Practice A'};
const payload=(language='en')=>({character:'noah',language,aiConsent:true,consentVersion:'2026-10-28-practice'});
async function call(path,data,who=user,extra={}){const request=new Request(env.PUBLIC_ORIGIN+'/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Origin:env.PUBLIC_ORIGIN,'cf-connecting-ip':'192.0.2.70'},...(data?{body:JSON.stringify(data)}:{})});return handle(request,{...env,...extra},who,fetcher);}
const settings=(language='en',version=0,settingsVersion=0,level='easy')=>({...payload(language),action:'settings',level,version,settingsVersion});
const turn=(language='en',version=0,settingsVersion=1,message='[BEGIN]')=>({...payload(language),version,settingsVersion,message,actionType:message==='[BEGIN]'?'begin':'free',requestId:crypto.randomUUID()});
const help=(kind='meaning',language='en')=>({...payload(language),kind,requestId:crypto.randomUUID(),turnVersion:1,draft:'I am scare but I follow you.'});
test('practice validates identity, supported pair, character and separate consent before model calls',async()=>{
 assert.equal((await call('practice',settings(),null)).status,401);
 for(const p of [{...settings(),character:'kael'},{...settings(),language:'ja'},{...settings(),supportLanguage:'en'},{...settings(),consentVersion:'2026-10-27'},{...settings(),level:'expert'}])assert.equal((await call('practice',p)).status,400);
 assert.equal(calls,0);
});
test('both language tracks persist separately from each other and regular stories',async()=>{
 for(const language of ['en','ko']){
  assert.equal((await call('practice',settings(language))).status,200);const p=turn(language),r=await call('practice',p);assert.equal(r.status,200);assert.equal((await r.json()).turn.version,1);
  assert.match(lastModel.systemInstruction.parts[0].text,new RegExp('entirely in '+language));assert.match(lastModel.systemInstruction.parts[0].text,/short sentences/);
  const n=calls;assert.equal((await call('practice',p)).status,200);assert.equal(calls,n);assert.equal((await call('practice',{...p,message:'other'})).status,409);
 }
 const en=await (await call('practice?language=en')).json(),ko=await (await call('practice?language=ko')).json();assert.equal(en.turns.length,1);assert.equal(ko.turns.length,1);assert.equal(en.story.support_language,'ko');assert.equal(ko.story.support_language,'en');
 assert.equal((await db.query('select count(*)::int as n from everstory_stories')).rows[0].n,0);
 assert.equal((await (await call('practice?language=en',null,{userId:'other',displayName:'Other'})).json()).turns.length,0);
 const restored=await (await call('practice')).json();assert.equal(restored.language,'ko');
});
test('meaning reads owned immutable turn, caches across request IDs and never advances the story',async()=>{
 const before=calls,p=help();const first=await (await call('practice-help',p)).json();assert.equal(first.help.choiceMeanings.length,3);assert.equal(calls,before+1);assert.equal((await (await call('practice-help',{...p,requestId:crypto.randomUUID()})).json()).cached,true);assert.equal(calls,before+1);
 assert.equal((await call('practice-help',{...p,turnVersion:99})).status,404);
 assert.equal((await call('practice-help',p,{userId:'other',displayName:'Other'})).status,409);
 assert.equal((await (await call('practice?language=en')).json()).story.version,1);
});
test('polish is separate, idempotent and preserves request fingerprint without storing raw draft',async()=>{
 const p=help('polish','ko'),n=calls;const r=await call('practice-help',p);assert.equal(r.status,200);assert.equal(calls,n+1);assert.equal((await call('practice-help',p)).status,200);assert.equal(calls,n+1);assert.equal((await call('practice-help',{...p,draft:'a different meaning'})).status,409);
 const stored=(await db.query("select * from everstory_practice_help where cache_key like 'polish:%'")).rows[0];assert.ok(!Object.hasOwn(stored,'draft'));assert.match(stored.fingerprint,/^[a-f0-9]{64}$/);assert.equal((await (await call('practice?language=ko')).json()).story.version,1);
});
test('settings reject stale writes and active generation; generation uses saved difficulty',async()=>{
 assert.equal((await call('practice',settings('en',1,0))).status,409);
 assert.equal((await call('practice',settings('en',1,1,'standard'))).status,200);
 assert.equal((await call('practice',turn('en',1,1))).status,409);
 await db.query("update everstory_practice_stories set lock_id=$1,lock_until=now()+interval '1 minute' where owner_id=$2 and language='en'",[crypto.randomUUID(),user.userId]);assert.equal((await call('practice',settings('en',1,2))).status,409);await db.exec('update everstory_practice_stories set lock_until=null,lock_id=null');
 await db.exec("delete from everstory_limits where key like 'story:user:minute:%'");const r=await call('practice',turn('en',1,2,'My name is Luna.'));assert.equal(r.status,200);assert.match(lastModel.systemInstruction.parts[0].text,/natural accessible language/);assert.equal((await r.json()).turn.level,'standard');
 const restored=await (await call('practice?language=en')).json();assert.deepEqual(restored.story.state.playerNotes,['My name is Luna.']);
});
test('provider failure releases help lock, cached help works at quota, new help shares story quota',async()=>{
 await db.exec("delete from everstory_limits where key like 'story:user:minute:%'");broken=true;const p=help('polish'),n=calls;assert.equal((await call('practice-help',p)).status,502);assert.equal(calls,n+1);assert.equal((await db.query('select lock_id from everstory_practice_help where cache_key=$1',['polish:v1:'+p.requestId])).rows[0].lock_id,null);broken=false;
 await db.query("insert into everstory_limits(key,used,expires_at) values($1,30,now()+interval '1 day') on conflict(key) do update set used=30,expires_at=now()+interval '1 day'",['story:user:day:'+user.userId]);const c=calls;assert.equal((await call('practice-help',help())).status,200);assert.equal(calls,c);assert.equal((await call('practice-help',help('polish'))).status,429);assert.equal(calls,c);assert.equal((await call('practice',turn('en',2,2,'Go ahead.'))).status,429);
});
test('help output validation rejects malformed arrays, huge content and missing fields',()=>{
 assert.throws(()=>validateHelp({sceneMeaning:'ok',choiceMeanings:['one']},'meaning'));assert.throws(()=>validateHelp({suggestion:'x'.repeat(2001),explanation:'ok',changed:true},'polish'));assert.throws(()=>validateHelp({suggestion:'ok',explanation:'ok'},'polish'));
});
test('new tables and RPC deny visitor roles; export and deletion include practice',async()=>{
 await db.exec('set role anon');await assert.rejects(db.query('select * from everstory_practice_stories'),/permission denied/);await assert.rejects(db.query("select everstory_practice_settings('evil','en','easy',0,0)"),/permission denied/);await assert.rejects(db.query("select everstory_help_finish('evil','x',gen_random_uuid(),'{}')"),/permission denied/);await db.exec('reset role');
 const exported=await (await call('export')).json();assert.equal(exported.practice.stories.length,2);assert.equal(exported.practice.turns.length,3);assert.ok(exported.practice.help.length>=2);
 const request=new Request(env.PUBLIC_ORIGIN+'/api/data',{method:'DELETE',headers:{Origin:env.PUBLIC_ORIGIN}});assert.equal((await handle(request,env,user,fetcher)).status,200);for(const table of ['stories','turns','help'])assert.equal((await db.query('select count(*)::int as n from everstory_practice_'+table)).rows[0].n,0);
});
test.after(()=>db.close());
