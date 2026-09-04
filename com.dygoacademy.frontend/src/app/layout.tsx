import type { Metadata } from 'next';

import { QueryProvider } from '@/components/layout/QueryProvider';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

import './globals.css';

export const metadata: Metadata = {
  title: 'Dygo Academy',
  description:
    'AI-powered collaborative vocabulary platform — spaced repetition, adaptive quizzes, and classroom groups.',
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
