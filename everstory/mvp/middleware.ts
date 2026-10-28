import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {siteOrigin} from './lib/seo';
export function middleware(request:NextRequest){
 const canonical=new URL(siteOrigin()),current=new URL(request.url);
 const legacy=String((env as Record<string,unknown>).LEGACY_SITE_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(current.hostname!==canonical.hostname&&legacy.includes(current.hostname))return NextResponse.redirect(new URL(current.pathname+current.search,canonical),308);
 return NextResponse.next();
}
export const config={matcher:['/','/guide','/faq','/characters/:path*','/experience','/experience.html','/privacy.html','/robots.txt','/sitemap.xml']};
