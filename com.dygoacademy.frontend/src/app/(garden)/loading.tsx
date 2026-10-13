'use client';

import { GardenLoader } from '@/components/garden/loader/GardenLoader';

/**
 * Route-level loading state for every /garden screen: the loading screen
 * (docs/plans/Loading screen implementation plan.md), not a grey skeleton
 * (Dylan, 2026-10-13). At app start LD1 "Seed to sprout" (LD3 at 4 s);
 * afterwards LD3 "Bee's flight", fading in after 400 ms so a fast load never
 * flashes it, and carrying on from any loader that was just showing. Slow
 * message and Try again at 10 s.
 */
export default function GardenLoading() {
  return <GardenLoader />;
}
