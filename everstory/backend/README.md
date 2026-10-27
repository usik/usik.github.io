# EverStory backend

The old `worker.mjs` is a historical deployment template, not the production backend. Do not enable it publicly; it lacks the MVP's durable history, per-account authorization and atomic usage limits.

The complete current application source lives in [`../mvp`](../mvp), with API implementation in `mvp/lib/api.mjs`, Supabase migrations in `mvp/supabase/001_everstory.sql`, and tests in `mvp/tests/api.test.mjs`.

Application: https://everstory.usik-luke.chatgpt.site

**Activation pending:** Supabase project connection, migration/retention setup, Gemini server secret, provider-region/privacy configuration, real account sign-in and live E2E validation. The deployed server returns explicit unconfigured errors until these steps succeed. Deployment is not MVP completion.
