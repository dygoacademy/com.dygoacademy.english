'use client';

import * as React from 'react';

import { registerMediaCache } from '@/lib/media-cache';

/**
 * Registers the service worker that caches audio on the phone
 * (`lib/media-cache.ts`, `public/sw.js`) once per garden visit. Renders
 * nothing.
 */
export function MediaCacheRegistrar() {
  React.useEffect(() => {
    registerMediaCache();
  }, []);
  return null;
}
