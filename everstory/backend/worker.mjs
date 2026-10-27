// EverStory API starter — deploy separately to Cloudflare Workers.
// Required secrets: GEMINI_API_KEY; required binding: WAITLIST (KV namespace).
// Configure ALLOWED_ORIGIN to your published EverStory origin.
const json=(body,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':origin,'vary':'Origin','cache-control':'no-store'}});
export default {async fetch(request,env){
 const origin=request.headers.get('origin')||'';
 const allowed=env.ALLOWED_ORIGIN||'https://usik.github.io';
 if(origin!==allowed)return json({error:'origin_not_allowed'},403,allowed);
 if(request.method==='OPTIONS')return new Response(null,{headers:{'access-control-allow-origin':allowed,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400'}});
 if(request.method!=='POST')return json({error:'method_not_allowed'},405,allowed);
 const url=new URL(request.url);let data;try{data=await request.json()}catch{return json({error:'invalid_json'},400,allowed)}
 if(url.pathname==='/api/waitlist'){
   const email=String(data.email||'').trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||data.consent!==true)return json({error:'invalid_submission'},400,allowed);
   if(!env.WAITLIST)return json({error:'storage_unconfigured'},503,allowed);
   const bytes=new TextEncoder().encode(email);const digest=await crypto.subtle.digest('SHA-256',bytes);const key='email:'+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
   const existing=await env.WAITLIST.get(key);if(existing)return json({ok:true,alreadyRegistered:true},200,allowed);
   await env.WAITLIST.put(key,JSON.stringify({email,language:String(data.language||'ko').slice(0,8),createdAt:new Date().toISOString(),consent:true}));
   return json({ok:true},200,allowed);
 }
 if(url.pathname==='/api/story'){
   if(!env.GEMINI_API_KEY)return json({error:'model_unconfigured'},503,allowed);
   const character=String(data.character||'').slice(0,80),message=String(data.message||'').slice(0,500),language=String(data.language||'ko').slice(0,8);
   if(!character||!message)return json({error:'missing_fields'},400,allowed);
   // Basic abuse protection is NOT sufficient for production. Add Turnstile and durable per-IP/user rate limits before enabling publicly.
   if(env.ENABLE_PUBLIC_STORY!=='true')return json({error:'demo_not_enabled'},503,allowed);
   const model=env.GEMINI_MODEL||'gemini-2.5-flash';
   const prompt='You are a fictional interactive romance storyteller. Character: '+character+'. Language: '+language+'. Continue the scene in 120 words maximum and propose exactly three distinct choices. Avoid copyrighted characters. Return JSON with fields scene (string) and choices (array of 3 strings).\nUser action: '+message;
   const upstream=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.9,maxOutputTokens:650}})});
   if(!upstream.ok)return json({error:'model_unavailable'},502,allowed);
   const body=await upstream.json();let story;try{story=JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text||'{}')}catch{return json({error:'model_format_error'},502,allowed)}
   if(typeof story.scene!=='string'||!Array.isArray(story.choices)||story.choices.length!==3)return json({error:'invalid_model_output'},502,allowed);
   return json({scene:story.scene.slice(0,1800),choices:story.choices.map(c=>String(c).slice(0,240))},200,allowed);
 }
 return json({error:'not_found'},404,allowed);
}};