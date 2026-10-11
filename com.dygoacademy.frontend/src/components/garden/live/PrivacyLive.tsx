'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import {
  useDeleteVoiceDonations,
  useSetVoiceDonation,
  useVoiceDonation,
} from '@/hooks/useVoiceDonation';
import { VOICE_DONATION_LINKS, type VoiceDonationRegion } from '@/lib/voice-donation';

import { PrivacyScreen, type PrivacyOverlay } from '../screens/PrivacyScreen';

/**
 * /me/privacy: A8e Privacy & data (voice donation).
 *
 * GET /profiles/me/voice-donation for the switch, count and date. Turning
 * on opens the confirm sheet; "Yes, donate" saves (PUT, method `setting`,
 * the region if one was picked, the app language). Turning off saves at
 * once and keeps what was donated. "Delete my donated recordings" asks,
 * then DELETE …/recordings and shows "Deleted…" at the bottom.
 */
export function PrivacyLive() {
  const t = useTranslations('screens.privacy');
  const locale = useLocale();
  const status = useVoiceDonation(true);
  const set = useSetVoiceDonation();
  const remove = useDeleteVoiceDonations();
  const [overlay, setOverlay] = React.useState<PrivacyOverlay>(null);
  const [region, setRegion] = React.useState<VoiceDonationRegion | 'none' | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const data = status.data;
  const fail = () => setToast(t('toast.error'));

  return (
    <PrivacyScreen
      backHref={GARDEN_ROUTES.me}
      status={
        data
          ? { donating: data.donating, count: data.count, since: data.since ? new Date(data.since) : null }
          : null
      }
      overlay={overlay}
      region={region}
      onRegionChange={setRegion}
      onSwitch={(on) => {
        setToast(null);
        if (on) {
          setRegion(data?.region ?? null);
          setOverlay('confirm');
        } else {
          set.mutate({ donating: false }, { onError: fail });
        }
      }}
      onConfirm={() =>
        set.mutate(
          {
            donating: true,
            method: 'setting',
            locale,
            ...(region === null ? {} : { region: region === 'none' ? null : region }),
          },
          { onSuccess: () => setOverlay(null), onError: fail },
        )
      }
      onDismiss={() => setOverlay(null)}
      onAskDelete={() => {
        setToast(null);
        setOverlay('delete');
      }}
      onDelete={() =>
        remove.mutate(undefined, {
          onSuccess: ({ deleting }) => {
            setOverlay(null);
            setToast(t('toast.deleted', { count: deleting }));
          },
          onError: () => {
            setOverlay(null);
            fail();
          },
        })
      }
      busy={set.isPending || remove.isPending}
      toast={toast}
      links={VOICE_DONATION_LINKS}
    />
  );
}
