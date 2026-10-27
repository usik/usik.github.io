# EverStory MVP

Continuation of https://github.com/usik/usik.github.io/tree/master/everstory . Retains the dark webtoon character catalogue and Korean/Japanese/English/Spanish UI. Next-compatible Vinext server on Sites; Supabase PostgreSQL storage; Gemini Flash generation. Public origin: https://everstory.usik-luke.chatgpt.site . The GitHub Pages version remains a separate static legacy preview until redirected.

## Production activation

1. Connect the owner's Supabase project. Apply `supabase/001_everstory.sql` once as a migration. Existing data must be backed up before changing any applied migration. Tables have RLS and no anonymous/authenticated direct access; only the server service role calls the RPCs.
2. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-flash-latest`), and `PUBLIC_ORIGIN` via Sites runtime secrets. Never paste keys into chat, commit them, or ship them to the client. No OpenAI key is used.
3. Confirm Gemini billing/data terms and Supabase storage region; update the privacy notice before activation. Enable pg_cron and schedule the bounded retention SQL commented in the migration. Verify both active-request and scheduled cleanup.
4. Set `SERVICE_ENABLED=true` only after the prior activation checks, then redeploy the saved source to apply environment changes. Missing secrets fail closed with an honest setup message; never replace real AI with a fake response.
5. With a real test account, complete desktop and physical-mobile sign-in, register a disposable controlled email twice, generate a first scene, use each of 3 recommendations and custom input, reload, switch characters/languages, and verify isolation. Export/delete only disposable test data. Verify upstream keys never appear in page source or network response.

## Runtime contracts

`GET /api/session`: capability and platform sign-in status. `POST /api/waitlist`: optional email and explicit versioned consent; SQL unique key prevents concurrent duplicates without enumerating existing emails. `GET /api/story?character=kael&language=ko`: latest 50 stored turns and character state. `POST /api/story`: authenticated generation, owner from platform only, `{character,language,message,version,requestId}`. `GET /api/export`: full account story export. `DELETE /api/data`: delete all account stories. Sign-in/out are platform-owned top-level navigation.

The model gets server-owned canon, the last 12 turns, rolling summary, state and user action. It returns a validated scene, exactly three unique choices, rolling summary, and state. User data never controls system canon, credentials or tools. Output is rendered with textContent. Server checks same-origin mutations, content-type, 10KB body limit, 1000-character action, and known language/character. Atomic PostgreSQL functions serialize story turns, reserve usage, reject stale versions, and cache completed request IDs. Default attempt limits: 6/user/minute, 30/user/day, 60/IP/day, 500/global/day, using rolling fixed windows. Failed upstream attempts also consume quota. New accounts/IP rotation can exhaust the global daily budget but cannot bypass it. No cost guarantee without provider-side quota/budget configuration.

History is stored in separate turns, not browser-only; displayed history is latest 50. Full export paginates all turns. Stories expire after 90 days of inactivity. Signup is not email verification or a full membership account. No email is sent by this application yet. Public signup email withdrawal currently requires operator handling.

## Development and verification

`node scripts/install-ci.mjs` or the Sites dependency helper; `pnpm dev` for the managed preview workflow. `node --test tests/*.test.mjs` executes API + real PostgreSQL (PGlite) contract tests with a stubbed Gemini upstream, never represented as live Gemini E2E. `pnpm exec tsc --noEmit` checks server types. Build with the Sites build helper. UI automation uses the supported cloud browser. No development identity bypass exists in production.

## Illustrations

Ten original AI-generated adult character portraits in `public/characters`. Generated with the built-in image tool, using distinct character-specific prompts. The prompt set is recorded in `art-prompts.json`. Source UI is based on the original EverStory index.html. All character IDs and translated names were retained.

## GitHub source snapshot

This directory contains the full MVP source. Portrait binaries are transported as `.webp.base64`; run `node scripts/restore-assets.mjs` to restore them (also runs before dev/build). This snapshot was taken from deployed source commit `ca49ae1fcb83b8a6bbaab885917f5f2be4848f00`. Production secrets and data are not included. The original GitHub Pages preview remains in `everstory/index.html` until production AI and storage activation succeeds.
