'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';
import { ProgressVine } from '../ProgressVine';

/** Top row of SP1–SP3: Close, "Speaking · The Pond", n/total and the progress vine. */
export function SpeakHeader({
  index,
  total,
  closeHref,
}: {
  /** 0-based sentence index. */
  index: number;
  total: number;
  closeHref: string;
}) {
  const t = useTranslations('screens.speak');
  const n = Math.min(total, index + 1);
  const progress = t('progress', { n, total });
  return (
    <div className="flex items-center gap-3">
      <IconButton asChild aria-label={t('close')}>
        <Link href={closeHref}>
          <CloseIcon width={20} height={20} />
        </Link>
      </IconButton>
      <div className="flex flex-grow flex-col gap-[5px]">
        <div className="flex justify-between text-[12px] font-semibold text-muted-foreground">
          <span>{t('header')}</span>
          <span aria-hidden="true">{progress}</span>
        </div>
        <ProgressVine value={n} max={total} valueText={progress} />
      </div>
    </div>
  );
}
