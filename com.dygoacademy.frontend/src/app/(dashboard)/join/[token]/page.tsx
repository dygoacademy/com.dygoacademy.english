'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTENT_WIDTH } from '@/constants/layout';
import { ROUTES } from '@/constants/routes';
import { useRedeemInvite } from '@/hooks/useInvites';
import { ApiError } from '@/lib/api-client';

/**
 * Wireframe turn 3's own "Try next" note — the screen a new student
 * actually lands on after opening a magic link, closing a gap flagged
 * since the second pass. Lives under `(dashboard)`, not a public route:
 * `POST /invites/:token/redeem` needs a caller identity (the joiner isn't
 * a member of anything yet, but must already be *someone* —
 * InvitesController's own comment), so an unauthenticated visit bounces
 * through `/login?next=/join/:token` via middleware.ts first, same as any
 * other protected path, then lands back here already signed in.
 *
 * Redeems automatically on mount rather than behind a confirm click — a
 * magic link is already the confirmation (whoever has the URL was meant
 * to receive it), and `redeemInvite` is safe to call more than once for
 * the same already-a-member caller (`RedeemedInvite.already_member`
 * covers that, GroupsService.redeemInvite's own SECURITY DEFINER function
 * handles the idempotent case at the database, not just here).
 */
export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const redeemInvite = useRedeemInvite();
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !token) return;
    attempted.current = true;

    redeemInvite.mutate(token, {
      onError: (err) => {
        setError(
          err instanceof ApiError
            ? err.status === 404
              ? 'This invite link is invalid.'
              : err.status === 410
                ? 'This invite link has expired, been revoked, or reached its use limit.'
                : err.message
            : 'Could not redeem this invite link.',
        );
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-8">
      <Card className={`w-full ${CONTENT_WIDTH.narrow}`}>
        <CardHeader>
          <CardTitle>Joining…</CardTitle>
          {redeemInvite.isPending && <CardDescription>Redeeming your invite link.</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <Button asChild variant="outline">
                <Link href={ROUTES.groups}>Go to your groups</Link>
              </Button>
            </>
          )}

          {redeemInvite.isSuccess && redeemInvite.data && (
            <>
              <p className="text-sm">
                You&apos;ve joined <b>{redeemInvite.data.group_name}</b> as{' '}
                <b>{redeemInvite.data.granted_role}</b>
                {redeemInvite.data.already_member && ' (you were already a member)'}.
              </p>
              <Button asChild>
                <Link href={ROUTES.groupDetail(redeemInvite.data.group_id)}>Go to the group</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
