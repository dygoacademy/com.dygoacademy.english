import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';

import { QueryProvider } from '@/components/layout/QueryProvider';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { normalizeLocale, URL_LOCALE_HEADER } from '@/i18n/config';

import './globals.css';

export const metadata: Metadata = {
  title: 'Dygo Academy',
  description:
    'AI-powered collaborative vocabulary platform — spaced repetition, adaptive quizzes, and classroom groups.',
};

/**
 * This app has NEVER shipped a viewport meta tag -- confirmed by grepping
 * Next.js's own metadata generator (node_modules/next/dist/lib/metadata):
 * there is no default `width=device-width, initial-scale=1` injected for
 * you, App Router requires this `viewport` export explicitly. Without it,
 * iOS Safari has no declared baseline scale to snap back to once anything
 * zooms the page in (an under-16px field, or any other trigger), so the
 * zoom sticks and the layout no longer fits the screen -- live-reported
 * 2026-09-05 after both "Add topic" and "Add word", even once every field
 * involved was already >=16px and the modals were blurring their focused
 * input before closing. Root cause was one level up from either of those
 * per-component fixes: this file, not the modals, is where it belongs.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The home pages (`/`, `/vi`, `/zh`) declare their language for search
  // engines; every other page keeps "en" here and sets its own `lang` on
  // the garden root.
  const homeLocale = normalizeLocale((await headers()).get(URL_LOCALE_HEADER));
  return (
    <html lang={homeLocale ?? 'en'} suppressHydrationWarning>
      {/* PWA (2026-10-13): install tags, written here rather than through
          `metadata` because Next 15.2+ streams metadata into <body> for
          browsers, and Chrome (manifest) and iOS Safari (home-screen
          name and full-screen launch) only read them in <head>.
          src/app/manifest.ts is the manifest itself. The default status bar
          keeps auth and onboarding screens, which have no safe-area
          padding, clear of the notch. */}
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="application-name" content="Dygo" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Dygo" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" />
      </head>
      <body>
        {/* Pinned to light regardless of OS/browser dark-mode setting — the
            app's dark palette (bg-card etc.) was rendering every card/form
            as a dark box with light text whenever the system was in dark
            mode, live-reported 2026-09-04. forcedTheme (not just
            defaultTheme) is what actually overrides system preference. */}
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
