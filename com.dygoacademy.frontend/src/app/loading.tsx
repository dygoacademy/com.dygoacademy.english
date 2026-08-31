/**
 * Default navigation-loading UI for any route without its own
 * loading.tsx. Kept as a plain skeleton, not a spinner component, so it
 * has zero dependency on providers that may not have mounted yet.
 */
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </main>
  );
}
