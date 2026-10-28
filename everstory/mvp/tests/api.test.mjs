import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {handle,validateOutput} from '../lib/api.mjs';
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
await db.exec(await readFile(new URL('../supabase/001_everstory.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/002_scene_visuals.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/analytics-schema.sql',import.meta.url),'utf8'));
const env={SERVICE_ENABLED:'true',SUPABASE_URL:'https://db.test',SUPABASE_SERVICE_ROLE_KEY:'test-server-only',GEMINI_API_KEY:'test-model-only',PUBLIC_ORIGIN:'https://everstory.test'};
const user={userId:'account-A',displayName:'Test A'};
let modelCalls=0,modelMode='ok',lastModel;
const output={scene:'서도윤은 우산을 조금 더 기울였다. “기억하고 있었구나.”',choices:['팔찌에 대해 묻는다.','우산 안으로 들어간다.','왜 돌아왔는지 묻는다.'],summary:'정류장에서 도윤과 재회. 팔찌의 기억을 공유했다.',state:{visual:'warm',location:'정류장',relationship:'조심스러운 재회',openThreads:['도윤이 떠난 이유']}};
async function fetcher(url,opts={}){
 const u=new URL(url),body=opts.body?JSON.parse(opts.body):undefined;
 if(u.hostname==='generativelanguage.googleapis.com'){
  modelCalls++;lastModel=body;
  if(modelMode==='error')return new Response('{}',{status:429});
  return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(modelMode==='invalid'?{scene:'bad',choices:['one']}:output)}]}}]});
 }
 assert.equal(u.hostname,'db.test');assert.equal(opts.headers.apikey,env.SUPABASE_SERVICE_ROLE_KEY);
 const route=u.pathname.replace('/rest/v1/','');
 if(route.startsWith('rpc/')){const name=route.slice(4);assert.match(name,/^everstory_[a-z]+$/);const keys=Object.keys(body);const q='select public.'+name+'('+keys.map((k,i)=>k+'=> $'+(i+1)).join(',')+') as result';const values=keys.map(k=>typeof body[k]==='object'?JSON.stringify(body[k]):body[k]);const r=await db.query(q,values);return Response.json(r.rows[0].result??null);}
 assert.ok(['everstory_stories','everstory_turns','everstory_waitlist'].includes(route));
 if(route==='everstory_waitlist'){
  await db.query('insert into everstory_waitlist(email,language,consent_version) values($1,$2,$3) on conflict(email) do nothing',[body.email,body.language,body.consent_version]);return new Response(null,{status:201});
 }
 const params=u.searchParams,conditions=[],values=[];
 for(const k of ['owner_id','character_id','language'])if(params.has(k)){values.push(params.get(k).slice(3));conditions.push(k+'=$'+values.length);}
 const where=conditions.length?' where '+conditions.join(' and '):'';
 if(opts.method==='DELETE'){await db.query('delete from '+route+where,values);return new Response(null,{status:204});}
 const fields=params.get('select')||'*';assert.match(fields,/^[a-z_,*]+$/);
 const order=params.get('order');assert.ok(!order||['version.desc','created_at.asc'].includes(order));
 const limit=Number(params.get('limit')||500),offset=Number(params.get('offset')||0);
 const r=await db.query('select '+fields+' from '+route+where+(order?' order by '+order.replace('.',' '):'')+' limit '+limit+' offset '+offset,values);return Response.json(r.rows);
}
const req=(path,body,method=body?'POST':'GET',origin=env.PUBLIC_ORIGIN)=>new Request(env.PUBLIC_ORIGIN+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.8'},...(body?{body:JSON.stringify(body)}:{})});
const call=(path,body,who=user,method,origin)=>handle(req(path,body,method,origin),env,who,fetcher);
const action=(character='kael',version=0,message='[BEGIN]')=>({character,language:'ko',version,message,requestId:crypto.randomUUID(),aiConsent:true,consentVersion:'2026-10-27'});

test('server boundaries: anonymous, CSRF, missing config, size, unknown canon, consent',async()=>{
 assert.equal((await call('story',action(),null)).status,401);
 assert.equal((await call('story',action(),user,undefined,'https://evil.test')).status,403);
 assert.equal((await handle(req('story',action()),{},user,fetcher)).status,503);
 assert.equal((await call('story',action('toString'))).status,400);
 assert.equal((await call('story',{...action(),aiConsent:false})).status,400);
 assert.equal((await call('story',{...action(),message:'x'.repeat(11000)})).status,413);
 assert.equal(modelCalls,0);
});
test('atomic signup normalization, duplicates, consent and per-IP limit',async()=>{
 const p={email:'  Reader@Example.com ',language:'ko',consent:true,consentVersion:'2026-10-27'};
 assert.equal((await call('waitlist',{...p,consent:false},null)).status,400);
 const responses=await Promise.all([call('waitlist',p,null),call('waitlist',p,null)]);
 assert.deepEqual(responses.map(r=>r.status),[200,200]);
 assert.equal((await db.query('select count(*)::int as n from everstory_waitlist')).rows[0].n,1);
 assert.equal((await db.query('select email from everstory_waitlist')).rows[0].email,'reader@example.com');
 for(let i=0;i<3;i++)assert.equal((await call('waitlist',p,null)).status,200);
 const limited=await call('waitlist',p,null);assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60');
});
test('turn generation, idempotent retry, free text, persistent memory and owner isolation',async()=>{
 const p=action();let r=await call('story',p);assert.equal(r.status,200);const first=await r.json();assert.equal(first.turn.version,1);assert.equal(first.turn.choices.length,3);assert.equal(first.turn.visual,'warm');
 const count=modelCalls;assert.equal((await call('story',p)).status,200);assert.equal(modelCalls,count);
 assert.equal((await call('story',{...p,message:'different'})).status,409);
 const b=action('kael',1,'내가 준 팔찌를 아직 갖고 있네.');r=await call('story',b);assert.equal(r.status,200);
 const memory=JSON.parse(lastModel.contents[0].parts[0].text);assert.equal(memory.memory,output.summary);assert.equal(memory.recent.length,1);assert.equal(memory.action,b.message);
 const stored=await (await call('story?character=kael&language=ko')).json();assert.equal(stored.turns.length,2);assert.equal(stored.story.version,2);assert.equal(stored.story.state.visual,'warm');assert.deepEqual(stored.turns.map(t=>t.visual),['warm','warm']);assert.deepEqual(stored.story.state.playerNotes,[b.message]);
 const other=await (await call('story?character=kael&language=ko',undefined,{userId:'account-B'})).json();assert.equal(other.turns.length,0);
 const c=await (await call('story?character=rin&language=ko')).json();assert.equal(c.turns.length,0);
 const exported=await (await call('export')).json();assert.equal(exported.turns.length,2);assert.equal(exported.turns[0].visual,'warm');
});
test('stale versions and in-flight concurrency do not double-charge model',async()=>{
 const before=modelCalls;assert.equal((await call('story',action('kael',0))).status,409);assert.equal(modelCalls,before);
 const a=action('rin'),b=action('rin');const statuses=await Promise.all([call('story',a),call('story',b)]).then(rs=>rs.map(r=>r.status).sort());
 assert.deepEqual(statuses,[200,409]);assert.equal(modelCalls,before+1);
});
test('provider failure/malformed output never saves fictional success and releases lock',async()=>{
 modelMode='error';const a=action('noah');const before=await db.query("select count(*)::int as n from everstory_turns where character_id='noah'");assert.equal((await call('story',a)).status,502);
 modelMode='invalid';assert.equal((await call('story',a)).status,502);
 const after=await db.query("select count(*)::int as n from everstory_turns where character_id='noah'");assert.equal(after.rows[0].n,before.rows[0].n);
 assert.equal((await db.query("select lock_id from everstory_stories where character_id='noah'")).rows[0].lock_id,null);modelMode='ok';
});
test('atomic global quota persists independently of account/IP and reset windows',async()=>{
 await db.query("insert into everstory_limits(key,used,expires_at) values('story:global:day',500,now()+interval '1 hour') on conflict(key) do update set used=500,expires_at=now()+interval '1 hour'");
 const before=modelCalls;assert.equal((await call('story',action('leo'),{userId:'fresh-account'})).status,429);assert.equal(modelCalls,before);
 await db.query("update everstory_limits set expires_at=now()-interval '1 second' where key='story:global:day'");
 assert.equal((await call('story',action('leo'),{userId:'fresh-account'})).status,200);
});
test('RLS blocks direct visitors and server-only RPCs',async()=>{
 await db.exec('set role anon');await assert.rejects(db.query('select * from everstory_waitlist'),/permission denied/);await assert.rejects(db.query("select everstory_limit('x',1,60)"),/permission denied/);await db.exec('reset role');
});
test('deleting own data cascades all turns but preserves other owners',async()=>{
 assert.equal((await call('data',undefined,user,'DELETE')).status,200);
 assert.equal((await db.query("select count(*)::int as n from everstory_turns where owner_id='account-A'")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int as n from everstory_turns where owner_id='fresh-account'")).rows[0].n,1);
});
test('invalid model outputs fail strict validation',()=>{assert.throws(()=>validateOutput({...output,choices:['same','same','third']}));assert.throws(()=>validateOutput({...output,state:{...output.state,openThreads:[{secret:true}]}}));});
test('visual enum rejects URLs and prompt-injected asset IDs; legacy output falls back safely',()=>{
 for(const visual of ['https://evil.test/tracker.png','../../private','toString',null,{},'WARM'])assert.throws(()=>validateOutput({...output,state:{...output.state,visual}}),/invalid_model_output/);
 const {visual,...legacy}=output.state;assert.equal(validateOutput({...output,state:legacy}).state.visual,'neutral');
 assert.deepEqual(lastModel.generationConfig.responseJsonSchema.properties.state.properties.visual.enum,['neutral','warm','tense','vulnerable','resolute']);
});
test('saved visual survives retry independently of later model response',async()=>{
 const who={userId:'visual-test',displayName:'Visual test'};output.state.visual='tense';const firstAction=action('noah');const first=await (await call('story',firstAction,who)).json();assert.equal(first.turn.visual,'tense');
 output.state.visual='resolute';const second=await (await call('story',action('noah',1,'함께 저주를 풀 방법을 찾자.'),who)).json();assert.equal(second.turn.visual,'resolute');
 const retry=await (await call('story',firstAction,who)).json();assert.equal(retry.turn.visual,'tense');
 const restored=await (await call('story?character=noah&language=ko',undefined,who)).json();assert.deepEqual(restored.turns.map(t=>t.visual),['tense','resolute']);assert.equal(restored.story.state.visual,'resolute');
 const exported=await (await call('export',undefined,who)).json();assert.deepEqual(exported.turns.map(t=>t.visual),['tense','resolute']);
 output.state.visual='warm';
});
test('anonymous analytics stores aggregates, deduplicates visitors and protects operator attribution',async()=>{
 const visit={event:'pageview',path:'/',source:'launch_x',referrer:'https://example.com/private?email=secret'};
 const request=body=>new Request(env.PUBLIC_ORIGIN+'/api/visit',{method:'POST',headers:{Origin:env.PUBLIC_ORIGIN,'Content-Type':'application/json','user-agent':'Mozilla/5.0 test-browser','cf-connecting-ip':'192.0.2.101'},body:JSON.stringify(body)});
 const before=modelCalls;for(let i=0;i<2;i++)assert.equal((await handle(request({...visit,isOperator:true}),env,null,fetcher)).status,200);
 let rows=(await db.query('select * from everstory_visits')).rows;assert.equal(rows.length,1);assert.equal(rows[0].pageviews,2);assert.equal(rows[0].is_operator,false);assert.equal(rows[0].referrer_host,'example.com');assert.match(rows[0].visitor_hash,/^[a-f0-9]{64}$/);
 assert.equal((await handle(request({event:'character_select',path:'/characters/noah'}),{...env,ANALYTICS_IS_OPERATOR:true},user,fetcher)).status,200);
 rows=(await db.query('select * from everstory_visits')).rows;assert.equal(rows.filter(r=>r.is_operator).length,2);assert.equal(modelCalls,before);
 assert.equal((await handle(request({...visit,path:'/api/export?email=secret'}),env,null,fetcher)).status,400);
 const bot=new Request(request(visit),{headers:{Origin:env.PUBLIC_ORIGIN,'Content-Type':'application/json','user-agent':'Googlebot','cf-connecting-ip':'192.0.2.102'}});assert.equal((await (await handle(bot,env,null,fetcher)).json()).recorded,false);
 const dnt=new Request(request(visit),{headers:{Origin:env.PUBLIC_ORIGIN,'Content-Type':'application/json','user-agent':'Mozilla/5.0','cf-connecting-ip':'192.0.2.103',dnt:'1'}});assert.equal((await (await handle(dnt,env,null,fetcher)).json()).recorded,false);
 await db.exec('set role anon');await assert.rejects(db.query('select * from everstory_visits'),/permission denied/);await assert.rejects(db.query("select everstory_visit(current_date,repeat('a',64),'/','pageview','direct','',false)"),/permission denied/);await db.exec('reset role');
});
test.after(async()=>{await db.close()});
