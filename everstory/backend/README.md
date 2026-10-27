# EverStory backend deployment checklist

Frontend: https://usik.github.io/everstory/ (GitHub Pages).

This folder contains a **deployment template, not a running backend**.

1. Create a Cloudflare Worker and a KV namespace named WAITLIST; bind KV to the Worker.
2. Set Worker environment variable ALLOWED_ORIGIN=https://usik.github.io.
3. Add secret GEMINI_API_KEY in Cloudflare (never put it in frontend source).
4. Set GEMINI_MODEL to a currently available Flash model ID. Verify the model is available in your Google account.
5. Configure a public contact email, privacy policy, retention period, and deletion workflow before accepting personal information.
6. Add Turnstile, per-IP/user rate limits, request budgets, and abuse monitoring before enabling story API. Set ENABLE_PUBLIC_STORY=true only then.
7. Update frontend signup to POST JSON to /api/waitlist on your Worker URL and story to POST /api/story.
8. Test signup storage, duplicate emails, consent, four languages, mobile browser, and LLM error handling.

Important: existing frontend signup still points to an empty Google Apps Script endpoint; it will NOT store signups until connected. The story preview is scripted, not live Gemini.
