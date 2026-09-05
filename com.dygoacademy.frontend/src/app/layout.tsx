import type { Metadata, Viewport } from 'next';

import { QueryProvider } from '@/components/layout/QueryProvider';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
