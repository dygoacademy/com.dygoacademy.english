import { redirect } from 'next/navigation';

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { GuestWordTrial } from '@/components/onboarding/GuestWordTrial';
import { ROUTES } from '@/constants/routes';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Landing page — wireframe 1a, "Try one word before signing up." Chosen
 * over the alternative onboarding paths (3-tap starter quiz, teacher
 * invite-link arrival) as the default entry for direct/organic visitors;
 * the invite-link path belongs on its own route once invites exist
 * (Phase 1, Module 1 — FR-1.3).
 *
 * Lives at "/search", not "/" — moved here 2026-09-17 as part of a wider
 * URL reshuffle (see constants/routes.ts's own header) that freed up the
 * bare root for the signed-in front door instead (now
 * `(dashboard)/page.tsx`). Keeps this file's original wireframe-1a
 * framing otherwise — still the anonymous entry point, just at a
 * different URL.
 *
 * Signed-in visitor redirect — live-requested 2026-09-17 ("user login we
 * redirect to /topics, if not login redirect to /", then updated the same
 * day once "/" and "/topics" swapped meaning): mirrors `(auth)/layout.tsx`'s
 * own auth check the other direction. Before this, a signed-in user landing
 * here (e.g. a bookmark, or typing the URL directly) saw the guest "try one
 * word" card again instead of their dashboard, even though /login and
 * /register already bounced them to ROUTES.home via that layout. An
 * anonymous visitor takes the opposite branch and simply renders the page
 * below — there is nowhere to redirect them to, they're already where an
 * anonymous visitor belongs.
 *
 * `PublicNavbar` above the trial card -- added the same day, alongside
 * `lib/supabase/middleware.ts` now sending an anonymous "/" visitor here
 * instead of to `/login` ("redirect them to search page with menu"). This
 * route is now the *only* way most anonymous visitors ever arrive, so it
 * needed its own way back to /login, not just forward into /register.
 *
 * `min-h-dvh`, not `min-h-screen` -- live-reported 2026-09-05 ("push the
 * home block to the center of the screen"): `min-h-screen` is a fixed
 * `100vh`, which on mobile Safari/Chrome is measured against the
 * *largest* possible viewport (address bar collapsed). On first load,
 * with the address bar still showing, the real visible area is shorter
 * than that, so a flex column centered inside a taller-than-visible box
 * lands below the actual vertical middle -- exactly "not centered" on a
 * phone despite `items-center justify-center` being correct. `dvh` (the
 * dynamic viewport unit Tailwind 3.4+ exposes as min-h-dvh) tracks the
 * real visible height as the browser chrome shows/hides instead.
 *
 * `<main>` no longer vertically centers (`justify-center` dropped for
 * top-anchored padding) -- fixed 2026-09-20 per a design-critique finding
 * (Phase 8, master schedule): centering short content in a full-height
 * flex box is correct on a tall phone, but on an iPad (either orientation)
 * or any short viewport it leaves the headline/input roughly a third of
 * the way down the screen, well below the first visible fold. The
 * dvh fix above solved *true* centering on mobile; it never addressed
 * that centering itself creates dead space when content is much shorter
 * than the viewport. Top-anchored spacing keeps the page usable across
 * every device this content-height-vs-viewport-height problem hits.
 *
 * Hero headline/subcopy scaled up at `sm`/`md` (`text-3xl`/`text-4xl`,
 * wider `max-w-md` subcopy, bigger gaps) -- fixed 2026-09-20, Phase 8
 * priority #2 (design-critique finding, same as the two entries above):
 * on iPad the page was rendering the exact same phone-sized hero text
 * just surrounded by more margin, reading as an unfinished phone layout
 * rather than a tablet-considered one. `GuestWordTrial`'s card itself is
 * deliberately left at its current width -- it already reads from the
 * shared `CONTENT_WIDTH` constant, which every page/popup in the app was
 * consolidated onto after past per-page width drift (see
 * `constants/layout.ts`'s own history); widening it here would reopen
 * that. Scaling the hero text/spacing instead uses the extra tablet width
 * without touching that settled decision or inventing new marketing copy
 * (a second column of supporting content) that doesn't exist yet.
 *
 * Outcome headline added 2026-09-20 (Phase 3 FR-17.2 -- "Dygo Learning
 * Path" concept's journey stage 1, "arrive with a promise"). This page
 * previously led with the mechanic ("try one word") and never named what
 * it's actually for; a visitor had no reason to connect "type a word,
 * see its IPA" with an IELTS outcome. Copy-only -- `GuestWordTrial`'s
 * lookup logic is untouched.
 */
export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(ROUTES.home);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNavbar />
      <main className="flex flex-1 flex-col items-center gap-6 p-4 pt-12 sm:gap-8 sm:pt-20 md:pt-28">
        <div className="flex flex-col items-center gap-2 text-center sm:gap-3">
          <h1 className="text-2xl font-semibold leading-snug sm:text-3xl md:text-4xl">
            Learn the words that move your IELTS score
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground sm:max-w-md sm:text-base">
            Try one word below — real audio, IPA, and example sentences, no account needed.
          </p>
        </div>
        <GuestWordTrial />
      </main>
    </div>
  );
}
