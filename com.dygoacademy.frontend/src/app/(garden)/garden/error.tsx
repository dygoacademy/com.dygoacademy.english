'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '@/components/garden/buttonStyles';
import { Button } from '@/components/garden/Button';
import { GARDEN_ROUTES } from '@/constants/garden';

/**
 * Error boundary for /garden screens (UI-3 U3-1): a friendly message with
 * "Try again" (re-renders the segment) and a way home. Inside the garden
 * layout, so the garden theme and translations are there. Classic screens
 * keep their own error handling.
 */
export default function GardenError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('screens.live');

  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-text"
    >
      <h1 className="font-display text-[24px] font-semibold leading-[1.15]">{t('errorTitle')}</h1>
      <p className="text-[15px] text-muted-foreground">{t('error')}</p>
      <div className="flex w-full max-w-[320px] flex-col gap-2">
        <Button variant="forest" className="w-full" onClick={() => reset()}>
          {t('retry')}
        </Button>
        <Link
          href={GARDEN_ROUTES.home}
          className={buttonClassName('secondary', { className: 'w-full' })}
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
