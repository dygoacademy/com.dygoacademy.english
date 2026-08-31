import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Marketing / landing page. The real page — public topic previews, pricing,
 * sign-up CTA — is Phase 1+; this placeholder exists so the App Router,
 * Tailwind, and shadcn/ui primitives are provably wired end to end.
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Dygo Academy</CardTitle>
          <CardDescription>
            Phase 0 frontend scaffold — App Router, Tailwind + shadcn/ui, TanStack Query,
            Zustand, and Supabase Auth are wired. Domain screens land in Phase 1 onward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled>Sign in (Phase 1)</Button>
        </CardContent>
      </Card>
    </main>
  );
}
