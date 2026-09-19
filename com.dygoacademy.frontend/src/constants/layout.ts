/**
 * Single source of truth for content-container widths -- every page's
 * outer `<main>`/`<div>` and every popup's `DialogContent` pulls its
 * width from here instead of hardcoding its own `max-w-*`.
 *
 * Added 2026-09-17 ("make every page and pop-up follow the same global
 * config") to replace what had turned into ad hoc, page-by-page choices:
 * `/study` sat at `max-w-sm` while `/quiz` -- the same kind of screen,
 * one card/question centered on the page -- got bumped to `max-w-md` the
 * same day a live report asked for more room, purely because the
 * follow-up feedback only mentioned quiz. `/settings` had drifted to its
 * own `max-w-lg`. Three different widths for what were, content-wise,
 * the same layout shape.
 *
 * Originally shipped as three distinct tiers (`narrow`/`default`/`wide`
 * at 384/448/672px) rather than one global width, specifically because a
 * single width matching Topics' grid (`max-w-2xl`) applied to a login
 * form, a delete-confirmation popup, or the flashcard itself reads as a
 * form floating in a mostly-empty page. Live-requested the same day
 * ("Could you please help me change all page and pop-up to wide
 * layout?"), with that exact tradeoff flagged again and confirmed --
 * every tier below now resolves to the same `max-w-2xl`, so every page
 * container and every `DialogContent` (`ui/dialog.tsx` reads `.narrow`
 * directly, so every modal follows without its own override) is 672px.
 * The three names are kept rather than collapsed into one constant so a
 * later "actually, popups look stretched, split them back out" is a
 * one-line value change here, not a re-thread through every call site
 * (each still names the tier it semantically belongs to: modals/forms
 * still use `.narrow`, single-item screens still use `.default`, grids
 * still use `.wide` -- only the underlying pixel value converged).
 *
 * Extend this object, don't hardcode a new `max-w-*` at a call site --
 * that's exactly how the three-way drift above happened the first time.
 *
 * `compact` added 2026-09-18 -- exactly the "actually, popups look
 * stretched, split them back out" case the paragraph above anticipated,
 * but scoped to one call site rather than reverting the wide-everywhere
 * decision generally: live-reported the same day ("The flashcard pop
 * with full with screen that look not like[nice]. Can you help me make
 * that more UI/UX?") that `WordCardModal` specifically -- a single word
 * + a fixed-height `h-80` card, not a form -- read as a small card
 * floating in a 672px box. Reverted the same day, though: asked next to
 * make every popup use the same width again ("make all popup use
 * default width"), so `WordCardModal` no longer overrides
 * `DialogContent`'s default and `.compact` has no current call site --
 * left defined here rather than deleted, since it's a one-line change to
 * reach for again if a single popup needs to diverge in the future.
 *
 * `ui/dialog.tsx`'s `DialogContent` reads `.default`, not `.narrow`, as
 * of the same 2026-09-18 request -- purely a naming choice today (both
 * still resolve to 672px), but "every popup" now traces to a tier
 * literally named `default` instead of `.narrow`, which read more like
 * "the tier popups happen to share with the auth cards."
 */
export const CONTENT_WIDTH = {
  narrow: 'max-w-2xl', // 672px -- was max-w-sm (384px) until the 2026-09-17 wide-everywhere change
  default: 'max-w-2xl', // 672px -- was max-w-md (448px) until the 2026-09-17 wide-everywhere change; every popup (ui/dialog.tsx) reads this tier
  wide: 'max-w-2xl', // 672px
  compact: 'max-w-sm', // 384px -- no current call site; kept for a single-popup exception if one's needed again (see WordCardModal.tsx's history)
} as const;
