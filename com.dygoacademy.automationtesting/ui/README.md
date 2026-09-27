# Word Garden UI tests (Playwright)

Phase 12, UI-3 U3-3 + U3-4. Screenshot and navigation tests of the Word Garden at the 8 QA viewports
of the design system (§16.1): `iphone-se`, `iphone-16`, `iphone-16-pro-max`,
`iphone-landscape`, `ipad-slide-over`, `ipad-portrait`, `ipad-landscape`,
`ipad-13-landscape`. One Playwright project per viewport.

What's covered:

- `tests/reference.spec.ts`: every canvas reference page `/garden/_reference/<name>`,
  one per PNG in `docs/design/garden/reference/`, in `en-SG` and (where a
  `-vi.png` exists) `vi-VN`. Dev-only pages, no sign-in needed.
- `tests/gallery.spec.ts`: `/garden/_gallery` in `en-SG` and `vi-VN`. Needs
  the signed-in fixture user (below); skips without one.
- `tests/navigation.spec.ts` (signed in): every tab of the tab bar opens and
  becomes current, and the tab bar keeps the same position and size on every
  tab (no layout jump); Back from a Topic bed returns to Topics and Back from a
  Group garden returns to Groups. The Back tests skip if the user has no topic
  or shared garden.

## Signed-in fixture user

`global-setup.ts` signs in once per run through `/login` and saves the session
to `.auth/user.json`; every test then starts signed in. Put a test account (not
your own) in `ui/.env.e2e`, which is gitignored:

```sh
E2E_EMAIL=garden-e2e@example.com
E2E_PASSWORD=...
```

The environment variables win over the file. Without them the signed-in tests
skip with a message and the reference screenshots still run. Give the account a
few topics and one shared garden so the Back tests run.

Every request sends the `dygo_ui=garden` cookie. Screenshots use the same bar
as `npm run garden:diff`: animations off, at most 0.5% of pixels different.

## On the Mac

```sh
# 1. Start the app (reference pages only exist in development)
cd com.dygoacademy.frontend && npm run dev

# 2. In another terminal
cd com.dygoacademy.automationtesting/ui
npm install                  # uses the installed Google Chrome; no browser download needed
                             # (or `npx playwright install chromium` + CHROME_PATH)
cp /dev/null .env.e2e && open -e .env.e2e   # fill E2E_EMAIL / E2E_PASSWORD (optional)
npm run test:update          # first run: writes baselines to tests/__screenshots__/<viewport>/
npm test                     # later runs: compare against the baselines
npm run report               # open the HTML report
```

Useful variations:

```sh
BASE_URL=http://localhost:3001 npm test          # another app URL
npx playwright test --project=iphone-16          # one viewport
npx playwright test -g "A6-topics"               # one screen
CHROME_PATH=/path/to/chromium npm test           # another browser binary
npm run typecheck                                # tsc --noEmit
```

Baselines (`tests/__screenshots__/`) are gitignored for now: they depend on the
OS and fonts, so they're made on the Mac. The pixel check against the canvas
itself stays `npm run garden:diff` in the frontend.
