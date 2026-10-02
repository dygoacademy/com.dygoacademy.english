'use client';

import { useTranslations } from 'next-intl';

import { Button } from '../Button';
import { Spinner } from '../Spinner';

/** Loading and error states for the live garden routes. */
export function LiveLoading() {
  const t = useTranslations('screens.live');
  return (
    <div
      role="status"
      className="flex min-h-screen-dvh flex-col items-center justify-center gap-3 bg-bg text-muted-foreground"
    >
      <Spinner />
      <span className="text-[15px]">{t('loading')}</span>
    </div>
  );
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
