# EverStory MVP

Continuation of https://github.com/usik/usik.github.io/tree/master/everstory . Retains the dark webtoon character catalogue and Korean/Japanese/English/Spanish UI. Next-compatible Vinext server on Sites; Supabase PostgreSQL storage; Gemini Flash generation. Public origin: https://everstory.usik-luke.chatgpt.site . The GitHub Pages version remains a separate static legacy preview until redirected.

## Production deployment

Public app: https://everstory.usik-luke.chatgpt.site . Supabase project `ucgdbqsnbtysasusvwdx` is in Seoul (`ap-northeast-2`). The initial schema and daily retention job are applied. The site server resolves the authenticated platform identity and forwards requests to the `everstory-api` Edge Function over HTTPS using a server-only random bearer token. Only its SHA-256 digest is in `supabase/functions/everstory-api/config.mjs`; the plaintext is stored in Sites runtime secrets. The Edge Function uses Supabase's built-in server credentials. No database admin key is sent to the browser or copied into Sites.

The Edge handler validates the shared credential, method/path/body size and trusted identity envelope before invoking the same tested API core. PostgreSQL tables have RLS and no visitor access; RPC functions are SECURITY INVOKER and only service_role may execute them. Sites owns visitor sign-in. The bridge's custom authentication replaces the Edge gateway JWT check; `verify_jwt=false` is intentional and does not make requests anonymous.

1. To rotate the bridge credential, generate a fresh high-entropy token, replace the hash in the Edge configuration, redeploy the Edge Function and update the matching Sites runtime secret. Never log or commit plaintext credentials.
2. Add `GEMINI_API_KEY` as a **Sites runtime secret**. The Sites server forwards it only in the authenticated HTTPS request body to the Edge Function; neither server logs the envelope. It never enters browser requests, frontend bundles, source files, or GitHub. A Supabase Edge secret remains an optional fallback. Set `GEMINI_MODEL` if needed (default `gemini-flash-latest`). Only the key name is documented; no value belongs in source. Confirm the Google API billing/data terms and finalize AI transfer notice before launch. Missing Gemini credentials leave AI unavailable while email signup works.
3. Verify `EVERSTORY_BACKEND_URL` and `EVERSTORY_BACKEND_TOKEN` in Sites runtime secrets. Redeploy a saved version after changing Sites variables. Sites secrets require deploying a saved version. Supabase Edge fallback secrets apply immediately.
4. With a real test account, complete desktop/physical-mobile sign-in, generate a first scene, use all three recommendations and custom input, reload and switch characters/languages. Verify account isolation and export/delete using disposable test data only. Email signup is separate from login.

Daily retention runs at 03:17 UTC: inactive stories after 90 days, waitlist emails after one year, expired usage counters after one day. The cron job is `everstory-retention`. Verify it in `cron.job` and `cron.job_run_details`. Supabase migration history records the initial schema and retention setup; do not rerun the initial schema on an existing database.

## Edge source sync

The Edge deployment includes `api.mjs`, `characters.mjs`, `worlds.mjs`, `bridge.mjs`, `index.js` and `config.mjs` from `supabase/functions/everstory-api/`. The first three are deployment copies of `lib/`; update them before deploying a core change. The project frontend uses `app/api/[...path]/route.ts` and `lib/bridge.mjs` to keep platform identity server-side.

## Runtime contracts

`GET /api/session`: capability and platform sign-in status. `POST /api/waitlist`: optional email and explicit versioned consent; SQL unique key prevents concurrent duplicates without enumerating existing emails. `GET /api/story?character=kael&language=ko`: latest 50 stored turns and character state. `POST /api/story`: authenticated generation, owner from platform only, `{character,language,message,version,requestId}`. `GET /api/export`: full account story export. `DELETE /api/data`: delete all account stories. Sign-in/out are platform-owned top-level navigation.

The model gets server-owned canon, the last 12 turns, rolling summary, state and user action. Up to 20 recent free-text inputs are retained literally as playerNotes independently of model summaries; routine recommendation clicks do not displace them. This improves continuity of exact names and player settings. Full history is still stored separately. It returns a validated scene, exactly three unique choices, rolling summary, and state. User data never controls system canon, credentials or tools. Output is rendered with textContent. Server checks same-origin mutations, content-type, 10KB body limit, 1000-character action, and known language/character. Atomic PostgreSQL functions serialize story turns, reserve usage, reject stale versions, and cache completed request IDs. Default attempt limits: 6/user/minute, 30/user/day, 60/IP/day, 500/global/day, using rolling fixed windows. Failed upstream attempts also consume quota. New accounts/IP rotation can exhaust the global daily budget but cannot bypass it. No cost guarantee without provider-side quota/budget configuration.

History is stored in separate turns, not browser-only; displayed history is latest 50. Full export paginates all turns. Stories expire after 90 days of inactivity. Signup is not email verification or a full membership account. No email is sent by this application yet. Public signup email withdrawal currently requires operator handling.

## Development and verification

`node scripts/install-ci.mjs` or the Sites dependency helper; `pnpm dev` for the managed preview workflow. `node --test tests/*.test.mjs` executes API + real PostgreSQL (PGlite) contract tests with a stubbed Gemini upstream, never represented as live Gemini E2E. `pnpm exec tsc --noEmit` checks server types. Build with the Sites build helper. UI automation uses the supported cloud browser. No development identity bypass exists in production.

## Illustrations

Ten original AI-generated adult character portraits in `public/characters`. Generated with the built-in image tool, using distinct character-specific prompts. The prompt set is recorded in `art-prompts.json`. Source UI is based on the original EverStory index.html. All character IDs and translated names were retained.

## GitHub portrait assets

Run `node scripts/restore-assets.mjs` to reconstruct `.webp` files from checked-in `.webp.base64` assets. Dev/build restores them automatically.
