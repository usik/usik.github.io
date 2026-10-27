import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { forwardToBackend } from '../../../lib/bridge.mjs';
import { handle } from '../../../lib/api.mjs';
export const dynamic = 'force-dynamic';
async function route(request:Request) {const user=await getChatGPTUser();return (await forwardToBackend(request,env,user))||handle(request,env,user);}
export {route as GET, route as POST, route as DELETE};
