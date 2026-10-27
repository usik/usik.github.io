import { handle } from './api.mjs';
import { makeEdgeHandler } from './bridge.mjs';
import config from './config.mjs';
let keys={};try{keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');}catch{}
const runtime={
 SUPABASE_URL:Deno.env.get('SUPABASE_URL'),
 SUPABASE_SECRET_KEY:keys.default||Object.values(keys)[0],
 SUPABASE_SERVICE_ROLE_KEY:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
 GEMINI_API_KEY:Deno.env.get('GEMINI_API_KEY'),
 GEMINI_MODEL:Deno.env.get('GEMINI_MODEL')||'gemini-flash-latest',
 SERVICE_ENABLED:'true'
};
Deno.serve(makeEdgeHandler(handle,config,runtime));
