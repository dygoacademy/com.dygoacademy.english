'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { useCreateInvite } from '@/hooks/useInvites';
import type { GroupRole } from '@/types';

import { GroupSheet } from '../GroupSheet';
import { InviteSheetBody } from '../InviteSheet';
import { displayLink, inviteUrl } from './groupData';

/**
 * GR5 live: the invite sheet over the current page (admins).
 *
 * The raw token exists only in the POST /groups/:id/invites response, so
 * the link is minted on the first Copy or Share, with the role and
 * limits chosen at that moment, and shown from then on. Changing any of
 * them afterwards clears the shown link; the next Copy / Share mints a
 * new one (the old link stays live until it expires; revoke it under
 * "Invite links"). The shared link is /join/<token>, the garden's own
 * join page since UI-8 U8-5.
 */
const EXPIRY_DAYS = [7, 1, 30, null] as const;
const USES = [20, 1, 100, null] as const;

export function InviteSheetLive({
  groupId,
  groupName,
  open,
  onOpenChange,
}: {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('screens.groups.invite');
  const create = useCreateInvite(groupId);
  const [role, setRole] = React.useState<GroupRole>('READ');
  const [expiry, setExpiry] = React.useState(0);
  const [uses, setUses] = React.useState(0);
  const [url, setUrl] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const reset = () => {
    setUrl(null);
    setStatus(null);
  };

  React.useEffect(() => {
    if (!open) {
      setUrl(null);
      setStatus(null);
    }
  }, [open]);

  async function ensureLink(): Promise<string | null> {
    if (url) return url;
    try {
      const days = EXPIRY_DAYS[expiry];
      const max = USES[uses];
      const invite = await create.mutateAsync({
        grantRole: role,
        ...(days ? { expiresInHours: days * 24 } : {}),
        ...(max ? { maxUses: max } : {}),
      });
      const next = inviteUrl(window.location.origin, invite.token);
      setUrl(next);
      return next;
    } catch {
      setStatus(t('failed'));
      return null;
    }
  }

  async function copy() {
    const link = await ensureLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setStatus(t('copied'));
    } catch {
      setStatus(t('copyFailed'));
    }
  }

  async function share() {
    const link = await ensureLink();
    if (!link) return;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('shareText', { group: groupName }), url: link });
        return;
      } catch {
        // Cancelled or unavailable: fall back to copying.
      }
    }
    await copy();
  }

  const days = EXPIRY_DAYS[expiry];
  const max = USES[uses];

  return (
    <GroupSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      subtitle={t('subtitle', { group: groupName })}
    >
      <InviteSheetBody
        role={role}
        onRoleChange={(next) => {
          setRole(next);
          reset();
        }}
        expires={days ? t('inDays', { count: days }) : t('never')}
        uses={max ? t('times', { count: max }) : t('unlimited')}
        onStepExpiry={() => {
          setExpiry((index) => (index + 1) % EXPIRY_DAYS.length);
          reset();
        }}
        onStepUses={() => {
          setUses((index) => (index + 1) % USES.length);
          reset();
        }}
        link={url ? displayLink(url) : null}
        linkPlaceholder={t('linkPlaceholder')}
        onCopy={() => void copy()}
        onShare={() => void share()}
        busy={create.isPending}
        status={status}
      />
    </GroupSheet>
  );
}
