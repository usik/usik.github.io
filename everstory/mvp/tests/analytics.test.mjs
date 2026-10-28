import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVisit,analyticsDay,dailyVisitorHash,isKnownBot} from '../lib/analytics.mjs';
test('analytics uses KST day boundary and rotates pseudonymous visitor hash daily',async()=>{
 assert.equal(analyticsDay(new Date('2026-10-27T14:59:59Z')),'2026-10-27');assert.equal(analyticsDay(new Date('2026-10-27T15:00:00Z')),'2026-10-28');
 const h=await dailyVisitorHash('192.0.2.1','Browser A','server-key','2026-10-28');assert.equal(h,await dailyVisitorHash('192.0.2.1','Browser A','server-key','2026-10-28'));assert.notEqual(h,await dailyVisitorHash('192.0.2.1','Browser A','server-key','2026-10-29'));assert.notEqual(h,await dailyVisitorHash('192.0.2.1','Browser B','server-key','2026-10-28'));
});
test('analytics strips personal URL data and permits only known public paths',()=>{
 assert.equal(normalizeVisit({event:'pageview',path:'/learn-korean',source:'korean_x_01'}).path,'/learn-korean');
 const v=normalizeVisit({event:'pageview',path:'/experience.html',source:'email@example.com',referrer:'https://example.com/private?email=private'});assert.deepEqual(v,{event:'pageview',path:'/experience',source:'direct',referrer:'example.com'});
 for(const path of ['/api/export','/characters/unknown','//evil.test','/?token=private','/signin-with-chatgpt'])assert.throws(()=>normalizeVisit({path,event:'pageview'}));
 assert.throws(()=>normalizeVisit({path:'/',event:'character_select'}));assert.equal(isKnownBot('Googlebot/2.1'),true);assert.equal(isKnownBot('Mozilla/5.0 Safari'),false);
});
