import {characters} from '../../lib/characters.mjs';
import {siteOrigin} from '../../lib/seo';
export const dynamic='force-dynamic';
export function GET(){const paths=['/','/guide','/faq','/learn-korean',...characters.map(c=>'/characters/'+c.id)];return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+siteOrigin()+path+'</loc><lastmod>'+(['/','/guide','/faq','/learn-korean'].includes(path)?'2026-10-29':'2026-10-28')+'</lastmod></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600'}});}
