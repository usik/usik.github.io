import {siteOrigin} from '../../lib/seo';
export const dynamic='force-dynamic';
export function GET(){return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /signin-with-chatgpt\nDisallow: /signout-with-chatgpt\nDisallow: /callback\n\nSitemap: ${siteOrigin()}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}});}
