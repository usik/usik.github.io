import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { handle } from '../../../lib/api.mjs';
export const dynamic = 'force-dynamic';
async function route(request:Request) {return handle(request, env, await getChatGPTUser());}
export {route as GET, route as POST, route as DELETE};
