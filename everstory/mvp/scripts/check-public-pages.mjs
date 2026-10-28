import assert from 'node:assert/strict';
const base=process.argv[2]||'http://localhost:4173';
const origin=process.env.EXPECTED_CANONICAL_ORIGIN||'https://everstory.usik-luke.chatgpt.site';
const paths=['/','/guide','/faq',...['kael','noah','ian','rin','haru','leo','ryu','sol','eve','ash'].map(id=>'/characters/'+id)];
for(const path of paths){const r=await fetch(base+path);assert.equal(r.status,200,path);const html=await r.text();assert.match(html,/<h1[\s>]/,path);assert.ok(html.includes('rel="canonical"')&&html.includes(origin+path),path+' canonical');assert.match(html,/property="og:title"/,path);assert.match(html,/name="description"/,path);assert.ok(!/<meta[^>]*name="robots"[^>]*content="noindex/.test(html),path);const blocks=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];for(const block of blocks)JSON.parse(block[1]);assert.ok(html.includes('/analytics.js'),path+' analytics');if(path.startsWith('/characters/'))assert.ok(html.includes('첫 장면 미리보기'),path);}
const sitemap=await (await fetch(base+'/sitemap.xml')).text();assert.equal((sitemap.match(/<loc>/g)||[]).length,13);assert.ok(!sitemap.includes('/api/')&&!sitemap.includes('/experience'));
const robots=await (await fetch(base+'/robots.txt')).text();assert.ok(robots.includes('Disallow: /api/')&&robots.includes('Sitemap: '+origin+'/sitemap.xml'));
const chat=await (await fetch(base+'/experience.html')).text();assert.match(chat,/<meta name="robots" content="noindex,follow">/);assert.ok(chat.includes('/everstory.js')&&chat.includes('/analytics.js'));
assert.equal((await fetch(base+'/characters/not-a-character')).status,404);
const img=await fetch(base+'/og-everstory.jpg');assert.equal(img.status,200);assert.ok(img.headers.get('content-type')?.includes('image/'));
console.log(JSON.stringify({publicPages:paths.length,canonical:true,metadata:true,jsonLdParse:true,sitemapUrls:13,robots:true,chatNoindex:true,unknownCharacter404:true,ogImage:true}));
