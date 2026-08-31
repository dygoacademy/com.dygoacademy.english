import { GuestWordTrial } from '@/components/onboarding/GuestWordTrial';

/**
 * Landing page — wireframe 1a, "Try one word before signing up." Chosen
 * over the alternative onboarding paths (3-tap starter quiz, teacher
 * invite-link arrival) as the default entry for direct/organic visitors;
 * the invite-link path belongs on its own route once invites exist
 * (Phase 1, Module 1 — FR-1.3).
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <GuestWordTrial />
    </main>
  );
}
