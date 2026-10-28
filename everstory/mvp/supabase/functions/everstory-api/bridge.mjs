export function makeEdgeHandler(handle, config, env, fetcher=fetch) {
 const json=(data,status)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 return async request=>{
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(token.length<40||token.length>200)return json({error:'unauthorized'},401);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
  let diff=digest.length^config.tokenDigest.length;for(let i=0;i<digest.length;i++)diff|=digest.charCodeAt(i)^config.tokenDigest.charCodeAt(i);
  if(diff!==0)return json({error:'unauthorized'},401);
  const reader=request.body?.getReader();let size=0,parts=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>22000){await reader.cancel();return json({error:'request_too_large'},413);}parts.push(value);}
  let data;try{const bytes=new Uint8Array(size);let n=0;for(const p of parts){bytes.set(p,n);n+=p.length;}data=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'invalid_json'},400);}
  if(!data||typeof data.path!=='string'||!/^\/api\/(session|story|waitlist|data|export|visit)(\?|$)/.test(data.path)||!['GET','POST','DELETE'].includes(data.method)||data.path.length>2000)return json({error:'invalid_envelope'},400);
  if(data.user!==null&&(!data.user||typeof data.user.userId!=='string'||!data.user.userId||data.user.userId.length>200||typeof data.user.displayName!=='string'))return json({error:'invalid_identity'},400);
  if(data.body!==null&&typeof data.body!=='string')return json({error:'invalid_envelope'},400);
  if(data.geminiApiKey!=null&&(typeof data.geminiApiKey!=='string'||data.geminiApiKey.length>256))return json({error:'invalid_envelope'},400);
  const headers={'cf-connecting-ip':String(data.ip||'unknown').slice(0,100),'Content-Type':'application/json'};
  if(data.origin)headers.Origin=String(data.origin);if(data.fetchSite)headers['sec-fetch-site']=String(data.fetchSite);
  if(data.dnt===true)headers.dnt='1';if(data.gpc===true)headers['sec-gpc']='1';
  headers['user-agent']=String(data.userAgent||'').slice(0,500);
  const inner=new Request(config.origin+data.path,{method:data.method,headers,...(data.method!=='GET'&&data.body!==null?{body:data.body}:{})});
  return handle(inner,{...env,GEMINI_API_KEY:data.geminiApiKey||env.GEMINI_API_KEY,PUBLIC_ORIGIN:config.origin,ANALYTICS_IS_OPERATOR:data.isOperator===true},data.user,fetcher);
 };
}
