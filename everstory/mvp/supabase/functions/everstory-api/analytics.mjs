export const ANALYTICS_STARTED='2026-10-28';
export function normalizeVisit(data){
 if(!data||!['pageview','character_select'].includes(data.event))throw Error('invalid_visit');
 let path=data.path;if(path==='/experience.html')path='/experience';
 if(typeof path!=='string'||!/^\/(?:experience|guide|faq|privacy\.html|characters\/(?:kael|noah|ian|rin|haru|leo|ryu|sol|eve|ash))?$/.test(path))throw Error('invalid_visit');
 if(data.event==='character_select'&&!path.startsWith('/characters/'))throw Error('invalid_visit');
 const source=typeof data.source==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(data.source)?data.source.toLowerCase():'direct';
 let referrer='';try{const ref=new URL(data.referrer);if(['http:','https:'].includes(ref.protocol))referrer=ref.hostname.toLowerCase().slice(0,120);}catch{}
 return {path,event:data.event,source,referrer};
}
export function analyticsDay(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,10);}
export function isKnownBot(ua){return !ua||/bot|crawler|spider|headless|preview|slurp|facebookexternalhit|whatsapp|telegram|discord|monitor|lighthouse/i.test(ua);}
export async function dailyVisitorHash(ip,ua,key,day){
 const bytes=new TextEncoder();const hmac=await crypto.subtle.importKey('raw',bytes.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',hmac,bytes.encode(JSON.stringify([day,ip,ua])));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
