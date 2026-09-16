import { GuestWordTrial } from '@/components/onboarding/GuestWordTrial';

/**
 * Landing page — wireframe 1a, "Try one word before signing up." Chosen
 * over the alternative onboarding paths (3-tap starter quiz, teacher
 * invite-link arrival) as the default entry for direct/organic visitors;
 * the invite-link path belongs on its own route once invites exist
 * (Phase 1, Module 1 — FR-1.3).
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
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <GuestWordTrial />
    </main>
  );
}
