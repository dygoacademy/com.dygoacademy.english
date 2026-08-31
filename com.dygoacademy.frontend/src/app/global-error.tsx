'use client';

/**
 * Catches errors thrown by the root layout itself — the one place
 * app/error.tsx can't reach, because a boundary can't catch errors in its
 * own parent. Must render its own <html>/<body>: at this point the real
 * root layout has failed, so there is no shell left to render into.
 * Deliberately has no Tailwind/shadcn dependency — if globals.css or a
 * provider is what broke, this page must still render without them.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <h1>Something went wrong</h1>
        <p>The application failed to load. Please try again.</p>
        <button onClick={reset} style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
