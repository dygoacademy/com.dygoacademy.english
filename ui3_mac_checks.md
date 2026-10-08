# UI-3 checks on Dylan's Mac (for the U3-5 wrap-up)

## Step 3: Playwright suite — ✅ passed (2026-09-30 ~20:50 SGT)
- Run: `npx playwright test` in `com.dygoacademy.automationtesting/ui`, against local `npm run dev` (localhost:3000), signed in via `.env.e2e` (seeded local test account).
- Includes the e2e sign-in fix `03a1ede` (exact label match) and U3-5a `3e602f8`.
- Result: **448 passed, 0 failed, 0 skipped** (7.7 min, 4 workers).
- 8 viewports × 56 tests each: iphone-se, iphone-16, iphone-16-pro-max, iphone-landscape, ipad-portrait, ipad-landscape, ipad-slide-over, ipad-13-landscape.
- Signed-in navigation ran (not skipped) on all 8: "every tab opens and the tab bar does not jump", "Back from a Topic bed returns to Topics", "Back from a Group garden returns to Groups".
- Gallery en-US/vi-VN and every /garden/_reference page (A1–A8 incl. A8-me-account, AU1–AU4, GR1–GR7) in en-US and vi-VN loaded.
- Full output: Dylan uploaded playwright-output.txt to the chat (453 lines).

## Step 2: tsc / lint / vitest / next build on the Mac (2026-09-30 ~20:58 SGT)
- `npx tsc --noEmit` ✅ clean
- `npx next lint` ✅ no warnings or errors
- `npm test` (Vitest 5) ✅ 34 files / 299 tests passed (incl. routes.test.ts 14 tests from U3-5a)
- `npm run build` ❌ compiled + type-checked OK, then failed at "Collecting page data" (/reset-password, /search): NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Not a code failure: the frontend has no .env.local, and the real build is `npm run build:prod:domain` (loads ../env-profiles/prod.env), which the deploy uses. Re-checked with that script (2026-09-30 ~21:01 SGT): ✅ `npm run build:prod:domain` compiled, type-checked, collected page data, generated 26/26 static pages; all /garden routes built (incl. /garden/_reference/[name], /garden/join/[token], /reset-password); middleware 106 kB.
- Noise, not failures: next lint deprecation notice; "multiple lockfiles" warning from a stray /Users/dylan/package-lock.json.

## Step 4: real iPhone check
- Signed-out redirect on the live site (checked by Claude 2026-09-30 21:25 SGT, cookie-less request to https://www.dygoacademy.com): `/garden/topics?ui=garden` → `/login?next=%2Fgarden%2Ftopics` ✅ (U3-5a is live); `/garden/_reference/A1-todays-garden` → 200, still public ✅ (GARDEN_REFERENCE_PAGES=on in prod.env — turn off when diffing is done).
- Tabs + Back at iPhone viewports: covered by the Playwright run above (iphone-se, iphone-16, iphone-16-pro-max, iphone-landscape, signed in) ✅.
- Real iPhone Safari tap-through (tabs, bed/group Back, full-screen Review, sign in returns to /garden/topics): ✅ all OK (Dylan, 2026-09-30 21:26 SGT).
