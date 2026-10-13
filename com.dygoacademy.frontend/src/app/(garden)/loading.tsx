'use client';

import * as React from 'react';

import { GardenLoader, isAppStart } from '@/components/garden/loader/GardenLoader';

/**
 * Route-level loading state for every /garden screen: the loading screen
 * (docs/plans/Loading screen implementation plan.md), not a grey skeleton
 * (Dylan, 2026-10-13: the skeleton kept showing after the bee screen).
 *
 * This is what shows when the page itself is loading or the next route is
 * slow: at app start LD1 "Seed to sprout" (LD3 at 4 s); afterwards LD3
 * "Bee's flight" (fades in after 400 ms, so a fast load never flashes it;
 * if `NavProgress` or another loader was just showing, it carries on from
 * there). Slow message and Try again at 10 s in total.
 */
export default function GardenLoading() {
  // Same on the server and on the first client render: nothing has been shown yet.
  const [appStart] = React.useState(() => isAppStart());
  return appStart ? <GardenLoader /> : <GardenLoader startAtBee delay />;
}
