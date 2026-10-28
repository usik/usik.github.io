import test from 'node:test';
import assert from 'node:assert/strict';
import { forwardToBackend } from '../lib/bridge.mjs';
import { makeEdgeHandler } from '../supabase/functions/everstory-api/bridge.mjs';
const token='unit-test-token-which-is-long-and-unpredictable-enough-for-a-fixture';
const tokenDigest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
const origin='https://everstory.test';
test('bridge rejects missing/wrong token before parsing or trusting identity',async()=>{
 let calls=0;const edge=makeEdgeHandler(()=>{calls++;return Response.json({ok:true})},{origin,tokenDigest},{});
 assert.equal((await edge(new Request(origin,{method:'POST'}))).status,401);
 assert.equal((await edge(new Request(origin,{method:'POST',headers:{Authorization:'Bearer '+'x'.repeat(64)}}))).status,401);
 assert.equal(calls,0);
});
test('Sites bridge preserves platform identity, action, original origin and IP',async()=>{
 const user={userId:'trusted-user',displayName:'Test',email:'not-forwarded@example.com'};
 let seen;
 const edge=makeEdgeHandler((req,env,owner)=>{seen={owner,origin:req.headers.get('origin'),ip:req.headers.get('cf-connecting-ip'),url:req.url};return Response.json({ok:true})},{origin,tokenDigest},{});
 const response=await forwardToBackend(new Request(origin+'/api/story?character=kael',{method:'POST',headers:{Origin:origin,'cf-connecting-ip':'192.0.2.3'},body:JSON.stringify({owner_id:'malicious',message:'hello'})}),{EVERSTORY_BACKEND_URL:origin+'/edge',EVERSTORY_BACKEND_TOKEN:token},user,async(url,init)=>edge(new Request(url,init)));
 assert.equal(response.status,200);assert.equal(seen.owner.userId,'trusted-user');assert.equal(seen.owner.email,undefined);assert.equal(seen.origin,origin);assert.equal(seen.ip,'192.0.2.3');assert.equal(seen.url,origin+'/api/story?character=kael');
});
test('bridge rejects requests above 10KB and unexpected envelope paths',async()=>{
 const response=await forwardToBackend(new Request(origin+'/api/story',{method:'POST',body:'x'.repeat(10001)}),{EVERSTORY_BACKEND_URL:origin+'/edge',EVERSTORY_BACKEND_TOKEN:token},null,()=>{throw Error('must not call upstream')});assert.equal(response.status,413);
 const edge=makeEdgeHandler(()=>{throw Error('must not execute')},{origin,tokenDigest},{});
 const bad=await edge(new Request(origin,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({path:'/rest/v1/other_table',method:'GET',body:null,user:null})}));assert.equal(bad.status,400);
});
test('bridge upstream failures return explicit unavailable response',async()=>{
 const r=await forwardToBackend(new Request(origin+'/api/session'),{EVERSTORY_BACKEND_URL:origin+'/edge',EVERSTORY_BACKEND_TOKEN:token},null,async()=>{throw Error('offline')});assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'backend_unavailable'});
});

test('upstream immutable headers become mutable for the hosting framework',async()=>{
 const r=await forwardToBackend(new Request(origin+'/api/session'),{EVERSTORY_BACKEND_URL:origin+'/edge',EVERSTORY_BACKEND_TOKEN:token},null,async()=>Response.redirect(origin+'/other',307));
 assert.doesNotThrow(()=>r.headers.set('Cache-Control','no-store'));
 assert.equal(r.status,307);assert.equal(r.headers.get('location'),origin+'/other');
});

test('model credential comes only from server env, not a visitor action',async()=>{
 let observed;
 const edge=makeEdgeHandler((req,env)=>{observed=env.GEMINI_API_KEY;return Response.json({ok:true})},{origin,tokenDigest},{});
 const r=await forwardToBackend(new Request(origin+'/api/story',{method:'POST',headers:{Origin:origin},body:JSON.stringify({geminiApiKey:'visitor-value',message:'hello'})}),{EVERSTORY_BACKEND_URL:origin+'/edge',EVERSTORY_BACKEND_TOKEN:token,GEMINI_API_KEY:'server-test-key'},null,async(url,init)=>edge(new Request(url,init)));
 assert.equal(observed,'server-test-key');assert.deepEqual(await r.json(),{ok:true});
});
test('unauthenticated envelope cannot supply model credentials',async()=>{
 let called=false;const edge=makeEdgeHandler(()=>{called=true;return Response.json({ok:true})},{origin,tokenDigest},{});
 const r=await edge(new Request(origin,{method:'POST',body:JSON.stringify({geminiApiKey:'visitor-value',path:'/api/story',method:'POST',body:'{}',user:null})}));assert.equal(r.status,401);assert.equal(called,false);
});
test('operator flag comes from trusted sign-in email and secret config, not visitor body',async()=>{
 let seen;const edge=makeEdgeHandler((req,env)=>{seen={isOperator:env.ANALYTICS_IS_OPERATOR,ua:req.headers.get('user-agent'),dnt:req.headers.get('dnt')};return Response.json({ok:true})},{origin,tokenDigest},{});
 const request=()=>new Request(origin+'/api/visit',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','user-agent':'Mozilla/5.0',dnt:'1'},body:JSON.stringify({isOperator:true,path:'/',event:'pageview'})});
 const runtime={EVERSTORY_BACKEND_URL:origin+'/edge',EVERSTORY_BACKEND_TOKEN:token,ANALYTICS_OPERATOR_EMAILS:'owner@example.com'};
 await forwardToBackend(request(),runtime,{userId:'A',displayName:'A',email:'other@example.com'},async(url,init)=>edge(new Request(url,init)));assert.equal(seen.isOperator,false);assert.equal(seen.ua,'Mozilla/5.0');assert.equal(seen.dnt,'1');
 await forwardToBackend(request(),runtime,{userId:'O',displayName:'Owner',email:'owner@example.com'},async(url,init)=>edge(new Request(url,init)));assert.equal(seen.isOperator,true);
});
