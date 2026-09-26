'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useInvitePreview } from '@/hooks/useGroupGarden';
import { useRedeemInvite } from '@/hooks/useInvites';
import { ApiError } from '@/lib/api-client';

import { avatarTone, initialOf } from '../GardenerAvatar';
import { JoinGardenScreen } from '../screens/JoinGardenScreen';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/join/[token]: GR6. The preview (GET /invites/:token/preview,
 * UI-G: name, description, inviter, role, counts, no member data), then
 * "Join the garden" redeems (POST /invites/:token/redeem, idempotent) and
 * opens the garden. Garden users reach this from the shared /join/<token>
 * link through the middleware.
 */
function errorMessage(error: unknown, t: (key: 'notFound' | 'expired' | 'failed') => string) {
  if (error instanceof ApiError && error.status === 404) return t('notFound');
  if (error instanceof ApiError && error.status === 410) return t('expired');
  return t('failed');
}

export function JoinLive({ token }: { token: string }) {
  const t = useTranslations('screens.groups.join');
  const router = useRouter();
  const preview = useInvitePreview(token);
  const redeem = useRedeemInvite();

  if (preview.isPending) return <LiveLoading />;
  if (preview.isError || !preview.data) {
    const known =
      preview.error instanceof ApiError && (preview.error.status === 404 || preview.error.status === 410);
    return known ? (
      <LiveError message={errorMessage(preview.error, t)} />
    ) : (
      <LiveError onRetry={() => void preview.refetch()} />
    );
  }

  const data = preview.data;
  const inviter = data.inviter_name
    ? { name: data.inviter_name, initial: initialOf(data.inviter_name), tone: avatarTone(data.inviter_name) }
    : null;

  return (
    <JoinGardenScreen
      groupName={data.group_name}
      description={data.group_description}
      inviter={inviter}
      counts={{ gardeners: data.member_count, beds: data.bed_count, words: data.word_count }}
      role={data.grant_role}
      closeHref={GARDEN_ROUTES.home}
      notNowHref={GARDEN_ROUTES.home}
      message={
        redeem.isError
          ? errorMessage(redeem.error, t)
          : data.already_member
            ? t('already', { group: data.group_name })
            : null
      }
      join={{
        busy: redeem.isPending,
        onClick: () =>
          data.already_member
            ? router.push(GARDEN_ROUTES.group(data.group_id))
            : redeem.mutate(token, {
                onSuccess: (result) => router.push(GARDEN_ROUTES.group(result.group_id)),
              }),
      }}
    />
  );
}
