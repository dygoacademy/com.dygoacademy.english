# Dygo Academy — session report, 2026-09-25 (overnight UI rebuild pass)

**Run**: automated scheduled task ("Dygo UI rebuild: UI-0 + UI-1 overnight pass"), no user present.
**Plan followed**: `ui rebuild implementation plan.md` → "Instructions for the automated pass".
**Result**: UI-0 and UI-1 committed and verified; a first slice of UI-2 committed. Classic UI unchanged.

---

## Commits (frontend only; nothing in the backend or `database/`)

| Commit | Phase | What |
| --- | --- | --- |
| `1173901` | UI-0 | Garden flag, `?ui=garden` / `?ui=classic` cookie, middleware redirect and 404 gate, empty `(garden)` route group |
| `3b530d5` | UI-1 | Scoped tokens, Tailwind names, fonts, `GARDEN_CONTENT_WIDTH`, next-intl (en), viewport + safe areas, `/garden/_tokens` |
| `4ebf713` | UI-2 (part 1) | First 7 components + `gcn()` + `/garden/_gallery` |

Each commit staged only the listed paths. The ~110 uncommitted changes from other work (Phase 10 FSRS, database squash, `LearningPath.tsx`, `timezone.ts`, …) were not touched. `git status` shows the same 110 entries before and after this pass.

## Starting state

- `git status`: 110 uncommitted entries, none of them in files this pass had to edit (`middleware.ts`, `globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `constants/layout.ts`, `config/env.ts`, `next.config.mjs`, `package.json` were all clean at HEAD `db24467`).
- A stale, empty `.git/index.lock` dated 2026-09-24 13:16 blocked git. Moved (not deleted) to `.git/stale-locks/`. The sandbox can't delete files, so git leaves a new `index.lock` / `HEAD.lock` behind after every command; each one was moved into `.git/stale-locks/` too. That folder and the `tmp_obj_*` files git couldn't unlink under `.git/objects/` (695 of them, most from earlier passes) are safe to delete on your Mac.
- Inventory recheck: every path in the plan's Inventory table exists in `src/`. The only drift is from uncommitted work: `topics/ActivityTrail.tsx` and `topics/DueNowCard.tsx` are deleted in the working tree. Neither is in the Inventory, so no plan changes were needed.
- Baseline checks before any edit: `tsc --noEmit` clean, `next lint` clean, and `npm test` fails with `Missing script: "test"`.

## What was built

### UI-0: flag and route group

- `NEXT_PUBLIC_GARDEN_UI` is an optional entry in `config/env.ts`. Only `"true"` turns it on. It's documented in `.env.example` and is unset everywhere else, so it's off by default.
- `lib/garden-ui.ts`: `?ui=garden` stores a one-year `dygo_ui=garden` cookie for that browser. `?ui=classic` stores `dygo_ui=classic`, which also overrides the env flag, so the UI-8 escape hatch already works.
- `middleware.ts` runs `updateSession` as before, with three additions:
  - It stores a `?ui=` override.
  - It 404s every `/garden/...` URL for unflagged requests by rewriting to an unmatched path. This lives in middleware, not only in the layout, because the App Router renders the page in parallel with its layout: a layout-level `notFound()` still streamed the page's RSC payload, and `next dev` showed this.
  - It sends a signed-in, flagged user from `/` to `/garden`. Auth redirects from `updateSession` are left alone.
- With the flag off and no cookie, the response is exactly what `updateSession` returns.
- `app/(garden)/layout.tsx` re-checks the flag and the session, the same defense in depth as `(dashboard)`. `app/(garden)/garden/page.tsx` is the empty A1 placeholder. `constants/garden.ts` holds the `/garden` paths.

### UI-1: foundations

- **Tokens** (`globals.css`): everything in design system §4–§7 and §12 is a CSS variable under `[data-ui="garden"]`. That covers colour, plant stages, rating pairs, spacing, radius, pressable shadows, motion, the responsive type scale (iPad sizes from 600px), font stacks and safe-area insets. The file also adds:
  - the Chinese overline, line-height and minimum-size rules from §4.3
  - the focus ring from §15
  - the reduced-motion overrides from §12
  - helper classes: `pt-safe`, `pb-safe`, `px-page-safe`, `pb-tabbar-safe`, `h-screen-dvh`, `min-h-screen-dvh`, `overline-label`, `tabular-nums-stat`

  I compiled the Tailwind CSS with the old and new config/CSS over the whole of `src/`: nothing classic changed, and the only differences are the added garden lines.
- **Tailwind names** (`tailwind.config.ts`):
  - colours: `bg-garden-*`, `text-garden-*`, `bg-stage-*`, `bg-rating-*`
  - type: `text-display-xl` … `text-label`, and `font-display` / `font-body`
  - radii: `rounded-tile` / `control` / `card` / `hero`
  - shadows, spacing and motion: `shadow-press-*`, `shadow-card-lift`, `px-page`, `duration-press` / `quick` / `bloom`, `ease-garden` / `bloom`
  - screens: `medium` (600), `expanded` (1024) and `short` (height < 500)
- **Widths**: `GARDEN_CONTENT_WIDTH` in `constants/layout.ts` (narrow 540, default 560/640, wide 720/1080, full width on iPhone).
- **Fonts**: `app/(garden)/fonts.ts` loads Fraunces 500/600 and Be Vietnam Pro 400–700 through `next/font/google`, with the latin, latin-ext and vietnamese subsets. Chinese uses the system CJK stack (PingFang SC → Noto Sans SC → Microsoft YaHei) and is never downloaded.
- **i18n**: next-intl `~4.4.0`. The pieces are `src/i18n/request.ts` (always `en`), `messages/en.json`, typed keys in `src/types/next-intl.d.ts`, and the plugin in `next.config.mjs`. The provider is only in the `(garden)` layout. Every new garden string goes through `t()`. The only exceptions are the §4.3 language test strings, which are fixtures.
- **Viewport**: the `(garden)` layout exports its own viewport with `viewport-fit=cover` and theme colour `#24463A`, so the root viewport for classic screens is unchanged.
- **Test page**: `/garden/_tokens` shows every colour (swatch next to the spec hex), stage, rating pair, text style in English / 简体中文 / Tiếng Việt, the Chinese overline, spacing, radii, elevation, motion, safe-area strips and width tiers. The folder is named `%5Ftokens` because a plain `_tokens` folder is private and gets no route in the App Router.

### UI-2 (part 1): first components

These are the components that §11 specifies fully without the mockup canvas. They live in `src/components/garden/`:

- `Button`: primary, secondary and forest variants; pressed, disabled and loading states (loading keeps the label); an optional second line; `asChild`
- `IconButton`: 44×44, and the type requires an `aria-label`
- `Chip`: `aria-pressed`
- `Card`: static, or with the whole card as one link
- `StatTile`
- `Switch`: `role="switch"`
- `ProgressVine`: a progressbar with a text equivalent
- `gcn()`: the default `cn()` in `lib/utils` uses tailwind-merge unconfigured, which silently drops `text-body-l` when it's next to `text-white`. `gcn()` teaches tailwind-merge the garden class names.

`/garden/_gallery` (flag-only) shows every state.

**Still to build for gate G1:** PlantGlyph (all stages and sizes), stage tile, word row, mission row, hero garden card, review card, rating bar, bottom tab bar, bottom sheet, toast, and the rewritten AudioButton.

## Checks run

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean after each phase |
| `npx next lint` | "No ESLint warnings or errors" after each phase |
| `npm test` | **Not run: the frontend has no `test` script** (`Missing script: "test"`), both before and after this pass. No test runner is installed. |
| `next build` | **Did not hang, but fails in the sandbox** because `fonts.googleapis.com` is unreachable. That's a network limit, not a code error. In a scratch copy with the fonts mocked (`NEXT_FONT_GOOGLE_MOCKED_RESPONSES`), `next build` **passed**: all routes, including `/garden` and `/garden/_tokens`, plus the middleware. `/garden/_gallery` was added after that build and has only been checked with `tsc`, lint and `next dev`. |
| `next dev` request matrix (scratch copy, no Supabase reachable, so every request is anonymous) | See the table below |
| Rendering | Captured `/garden/_tokens` and `/garden/_gallery` from `next dev` and rendered them at 390×844 and 820×1180. The tokens apply. The type scale goes from 28px to 34px at iPad width. The Chinese overline has no uppercase or letter-spacing and is 13px. Buttons are full width on iPhone and 400px on iPad. Switches are 52×32. There's no horizontal scroll. The fonts showed as fallbacks because Google Fonts is unreachable here, so **the real Fraunces / Be Vietnam Pro rendering still needs checking on your Mac.** |

`next dev` request matrix:

| Request | Result |
| --- | --- |
| `/` | 307 → `/search`, unchanged |
| `/?ui=garden` | 307 → `/search`, and sets the cookie |
| `/garden` without the cookie | **404** |
| `/garden/_tokens` without the cookie | **404** |
| `/garden` with the cookie | Renders, then the session guard redirects to `/login` |
| `/garden?ui=classic` | 404, and sets `dygo_ui=classic` |
| `/search` and `/login` | 200, unchanged |

**Not verifiable here:** the signed-in `/` → `/garden` redirect needs a real Supabase session, so it needs one manual check on your Mac.

## Assumptions (the plan's open decisions aren't answered yet)

1. **Body font: Be Vietnam Pro**; display font: Fraunces. Supporting evidence: Next's own Google Fonts table (`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`) lists DM Sans with **only latin and latin-ext, no vietnamese subset**. Fraunces and Be Vietnam Pro both have one.
2. **URLs**: everything stays under `/garden/...`. The `/garden` paths live in `constants/garden.ts`, not `routes.ts`, until UI-8.
3. **Phase names**: kept as UI-0 … UI-8.
4. **Tailwind names are namespaced**, which differs from the plan's `bg-surface` / `text-muted`:
   - Colours use `garden-` (`bg-garden-surface`, `text-garden-muted`) because `muted`, `primary`, `border` and `background` still belong to the classic UI.
   - The screens are `medium` / `expanded` / `short`, not `md` / `lg`, because classic screens still use `md:` at 768px (`search/page.tsx`, `ui/navigation-menu.tsx`). Changing `md` to 600 would reflow them.
   - Radii are named by use (`rounded-card`, not `rounded-lg`).

   UI-8 drops the prefix and renames the screens to `md` / `lg`. Both are mechanical find-and-replace jobs.
5. **`CONTENT_WIDTH` isn't rewritten.** Rewriting it would resize every classic screen. `GARDEN_CONTENT_WIDTH` sits next to it with the same tier names, and replaces it in UI-8.
6. **next-intl is pinned to `~4.4.0`.** From 4.5 on, next-intl depends on native `@swc/core` (and 4.14 also on `@parcel/watcher` and `@eloqnt/*`). Installing those from the Linux sandbox would have put Linux-only binaries into your Mac's `node_modules`. 4.4 has only pure-JS dependencies and supports Next 15.
7. **`/garden` requires sign-in**, through the `(garden)` layout. `?ui=classic` was added now, not in UI-8, because it costs nothing.

## Things to know

- **`node_modules` was patched by hand.** The 11 new packages were copied in so the Mac's platform-specific binaries weren't disturbed. `package.json` and `package-lock.json` are correct and committed. **Run `npm install` on your Mac once** so npm's own bookkeeping matches.
- **Builds now need Google Fonts at build time.** That includes Docker and CI. It's how `next/font/google` works, and the fonts are then served from our own domain, which is what §14.6 wants for China. If a build machine can't reach Google, switch `fonts.ts` to `next/font/local` with the woff2 files committed.
- **The garden session guard is only in the layout.** Because pages render in parallel with layouts, add `/garden` to `PROTECTED_PATH_PREFIXES` in `routes.ts` before any garden page renders user data on the server (UI-3/UI-4). I didn't do it tonight because `routes.ts` has someone else's uncommitted changes.
- **The master schedule changelog line (5.48) is added but not committed.** `dygo_academy_master_project_schedule.md` already had uncommitted edits (5.45–5.47) from other work, and committing it would have swept those in. It will go in with that work's commit.
- Scratch files from this pass: `com.dygoacademy.frontend/.next/garden-snapshot/` (gitignored) and `.git/stale-locks/`. Both are safe to delete.

## Skipped, and why

- **Baseline screenshots of the current UI (UI-0).** These need a signed-in session with real data, and the sandbox can't reach Supabase or the API.
- **Exporting the 8 adult mockups to `docs/design/garden/` (UI-0).** The Word Garden design canvas isn't accessible from this pass.
- **Answering the plan's open decisions.** Those are Dylan's; the defaults above were used.

## Next open item

Finish UI-2, starting with **PlantGlyph** (every stage and size) and the **rating bar** / **review card**, which UI-4 needs. G1 needs the mockup PNGs in `docs/design/garden/` for side-by-side checks, so exporting them from the canvas is the first manual step. Before that, please confirm or override assumptions 1 (font) and 4 (namespaced Tailwind names).

## What to check in the morning

1. `cd com.dygoacademy.frontend && npm install && npm run dev`, then open `http://localhost:3000/?ui=garden` while signed in. You should land on `/garden`.
2. Open `/garden/_tokens` on an iPhone (or Safari's responsive mode) and check that Fraunces and Be Vietnam Pro load, the Vietnamese diacritics don't clip, and Chinese falls back to PingFang SC.
3. Open `/garden/_gallery` and try the press, loading, chip, switch and vine states.
4. Visit `/?ui=classic` and check that the app is exactly as before, and that `/garden` now 404s.
5. Run `next build` on your Mac (it needs internet for the fonts).
