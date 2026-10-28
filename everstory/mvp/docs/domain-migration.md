# Domain migration runbook

Current canonical origin: https://everstory.usik-luke.chatgpt.site . Stable public paths: `/`, `/characters/{id}`, `/guide`, `/faq`. Chat remains `/experience.html?lang=...&character=...`. API and personal story records are not indexable public content.

## Before buying a domain

- Preserve the Sites project ID, Supabase project and database. Domain changes do not require cloning the Site or copying user data.
- All canonical, Open Graph, structured-data and sitemap absolute URLs come from `PUBLIC_SITE_URL`; internal links and assets are relative.
- No future domain is guessed, reserved or published as canonical before ownership/DNS/TLS are ready.
- Verification meta tags can be added later after Google Search Console/Naver/Bing ownership setup. This release does not claim these tools are verified or pages indexed.

## After ownership is verified

1. Add the owned custom domain using Sites and complete its returned DNS instructions. Wait for successful routing and HTTPS. Verify Sites sign-in/callback support for the new hostname; an SEO redirect cannot replace authentication setup. Existing visitors may need to sign in again. Verify that site-scoped account identities still match existing stories.
2. Update `PUBLIC_SITE_URL` to the HTTPS origin without a path. Set `LEGACY_SITE_HOSTS` to the exact previous Site hostname(s), without protocols or wildcards. Deploy the saved version to apply variables. `middleware.ts` issues a 308 redirect for public pages on those explicitly named legacy hosts, preserving path and query. Never redirect to a URL supplied by a visitor.
3. Update `supabase/functions/everstory-api/config.mjs`'s `origin` to the new canonical origin and redeploy the Edge Function. Coordinate this with Sites deployment: mutations must keep their strict same-origin boundary. Do not weaken CORS or disable the shared bearer authentication to ease migration.
4. Update GitHub Pages' old EverStory entry redirect. Refresh social profiles and owned links. Keep a one-to-one URL mapping for character pages; do not redirect every detail page to the homepage.
5. Verify canonical, OG URLs, JSON-LD, sitemap, robots, all character CTAs and static assets on the new host. Re-run the public-page checker with expected canonical origin adapted to the new host. Exercise real sign-in, story restore/new turn, signup and analytics.
6. Verify the new property with Google Search Console and Naver Search Advisor; submit the new sitemap. Use supported change-of-address tooling where applicable. Do not claim indexation or answer-engine citations are guaranteed.
7. Retain redirects for at least one year when possible. Monitor errors and both old/new search properties. Avoid a simultaneous URL redesign.

References (official):
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/crawling-indexing/301-redirects
- https://searchadvisor.naver.com/guide/seo-basic-robots
