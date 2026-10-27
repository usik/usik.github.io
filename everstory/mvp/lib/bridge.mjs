// The token is only in Sites runtime secrets. The Edge deployment stores its SHA-256 digest.
export async function forwardToBackend(request, env, user, fetcher=fetch) {
  if (!env.EVERSTORY_BACKEND_URL || !env.EVERSTORY_BACKEND_TOKEN) return null;
  const url = new URL(request.url);
  const reader = request.body?.getReader(); let size = 0; const parts=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>10000){await reader.cancel();return Response.json({error:'request_too_large'},{status:413});}parts.push(value);}
  const bytes=new Uint8Array(size);let n=0;for(const p of parts){bytes.set(p,n);n+=p.length;}
  try {
    const upstream = await fetcher(env.EVERSTORY_BACKEND_URL, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.EVERSTORY_BACKEND_TOKEN},
      body:JSON.stringify({geminiApiKey:env.GEMINI_API_KEY||null,path:url.pathname+url.search,method:request.method,body:size?new TextDecoder().decode(bytes):null,origin:request.headers.get('origin'),fetchSite:request.headers.get('sec-fetch-site'),ip:request.headers.get('cf-connecting-ip')||'unknown',user:user?{userId:user.userId,displayName:user.displayName}:null}),
      signal:AbortSignal.timeout(80000)
    });
    // Fetch responses have immutable headers; Vinext adds its cache headers.
    return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:new Headers(upstream.headers)});
  } catch { return Response.json({error:'backend_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
