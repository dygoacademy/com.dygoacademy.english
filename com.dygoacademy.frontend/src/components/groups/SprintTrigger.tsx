'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTriggerSprint } from '@/hooks/useTriggerSprint';
import { ApiError } from '@/lib/api-client';
import type { SprintResult } from '@/types';

/**
 * Wireframe 8g — FR-6.2's teacher-triggered immediate class reminder. The
 * eighth pass's own caption flagged this route as "API- and wireframe-only
 * for now: there is no group-management frontend at all yet for a teacher
 * to trigger it from." This is that trigger, now that the frontend exists.
 */
export function SprintTrigger({ groupId }: { groupId: string }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SprintResult | null>(null);
  const triggerSprint = useTriggerSprint(groupId);

  const handleTrigger = async () => {
    setError(null);
    setResult(null);
    try {
      const res = await triggerSprint.mutateAsync({ message: message.trim() || undefined });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the reminder.');
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Send a reminder now</h2>
      <p className="text-xs text-muted-foreground">
        Pushes to every other member&apos;s subscribed devices immediately — not on the next
        15-minute tick.
      </p>
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message (defaults to a generic reminder)"
          maxLength={200}
          className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Button onClick={handleTrigger} disabled={triggerSprint.isPending}>
          {triggerSprint.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <p className="text-xs text-muted-foreground">
          Sent to {result.sent}/{result.recipients} subscribed devices
          {result.pruned > 0 && ` (${result.pruned} dead subscriptions cleaned up)`}.
        </p>
      )}
    </section>
  );
}
