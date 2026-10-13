'use client';

import { useTranslations } from 'next-intl';

import { Button } from '../Button';
import { GardenLoader } from '../loader/GardenLoader';

/**
 * Loading and error states for the live garden routes. `LiveLoading` is the
 * loading screen (LD1 at app start, LD3 for slow loads, see
 * `loader/GardenLoader.tsx`); pass a screen's `refetch` as `onRetry` for the
 * slow state's Try again (default: reload the page).
 */
export function LiveLoading({ onRetry }: { onRetry?: () => void } = {}) {
  return <GardenLoader onRetry={onRetry} />;
}

export function LiveError({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const t = useTranslations('screens.live');
  return (
    <div
      role="alert"
      className="flex min-h-screen-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center"
    >
      <p className="text-[15px] text-muted-foreground">{message ?? t('error')}</p>
      {onRetry ? (
        <Button variant="forest" className="w-full max-w-[320px]" onClick={onRetry}>
          {t('retry')}
        </Button>
      ) : null}
    </div>
  );
}
