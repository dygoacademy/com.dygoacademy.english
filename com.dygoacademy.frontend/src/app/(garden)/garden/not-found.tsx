'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '@/components/garden/buttonStyles';
import { EmptyState } from '@/components/garden/EmptyState';
import { GARDEN_ROUTES } from '@/constants/garden';

/**
 * Not-found page for garden screens that call `notFound()` (UI-3 U3-1),
 * e.g. a topic or group that doesn't exist. The flag check in the garden
 * layout calls `notFound()` above this segment, so unflagged visitors
 * still get the classic 404, never this page.
 */
export default function GardenNotFound() {
  const t = useTranslations('screens.live');
  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col justify-center gap-4 bg-garden-bg px-5 text-garden-text">
      <EmptyState
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        action={
          <Link
            href={GARDEN_ROUTES.home}
            className={buttonClassName('primary', { className: 'w-full' })}
          >
            {t('backHome')}
          </Link>
        }
      />
    </div>
  );
}
