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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
