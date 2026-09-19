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
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold leading-snug">
            Learn the words that move your IELTS score
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try one word below — real audio, IPA, and example sentences, no account needed.
          </p>
        </div>
        <GuestWordTrial />
      </main>
    </div>
  );
}
