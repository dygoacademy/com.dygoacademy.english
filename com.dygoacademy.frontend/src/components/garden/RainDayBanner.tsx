import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { RainCloud, RainDrop } from './groupArt';

/**
 * A rain day: a group's "everyone water N words today" push, as a banner
 * with a Water button (canvas GR1 and GR2).
 *
 * - `forest` (GR1, the gardens list): dark card, cloud, an eyebrow
 *   ("Rain day today"), the garden and word count, and the group's
 *   progress.
 * - `water` (GR2, inside the garden): light blue, a drop, the word count
 *   and the group's progress with yours.
 *
 * Progress is aggregate only: how many gardeners are done, never who.
 */
export interface RainDayBannerProps {
  variant: 'forest' | 'water';
  /** "IELTS Sprint · water 10 words" or "Rain day · water 10 words". */
  title: string;
  /** "3 of 5 done · ends 11:59 PM". */
  detail: string;
  waterHref: string;
  className?: string;
}

const WATER_BUTTON =
  'flex h-10 shrink-0 items-center rounded-[14px] bg-garden-primary px-[14px] text-[14px] font-bold text-white shadow-[0_3px_0_var(--color-primary-shadow)] active:translate-y-px';

export function RainDayBanner({ variant, title, detail, waterHref, className }: RainDayBannerProps) {
  const t = useTranslations('components.groups');
  if (variant === 'forest') {
    return (
      <section
        aria-label={t('rainDayToday')}
        className={gcn(
          'relative mx-4 flex items-center gap-3 overflow-hidden rounded-[22px] bg-garden-forest px-4 py-[14px] text-garden-on-forest',
          className,
        )}
      >
        <RainCloud width={46} height={40} />
        <div className="flex flex-grow flex-col">
          <span className="text-[12px] font-semibold uppercase tracking-[.08em] text-stage-sprout">
            {t('rainDayToday')}
          </span>
          <span className="text-[15px] font-bold">{title}</span>
          <span className="text-[12px] text-garden-on-forest-muted">{detail}</span>
        </div>
        <Link href={waterHref} className={WATER_BUTTON}>
          {t('water')}
        </Link>
      </section>
    );
  }
  return (
    <section
      aria-label={title}
      className={gcn(
        'mx-4 flex items-center gap-2.5 rounded-[18px] border border-garden-water-border bg-garden-water-soft px-3 py-2.5',
        className,
      )}
    >
      <RainDrop width={30} height={30} />
      <div className="flex flex-grow flex-col">
        <span className="text-[14px] font-bold text-garden-water-text">{title}</span>
        <span className="text-[12px] text-garden-water-text-soft">{detail}</span>
      </div>
      <Link href={waterHref} className={WATER_BUTTON}>
        {t('water')}
      </Link>
    </section>
  );
}
