'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from '@/components/garden/cn';

import {
  FeatureWaterIcon,
  GrowUpIcon,
  HomeFlower,
  HomeSeed,
  HomeSprout,
  HomeTree,
  StageArrow,
} from './homeArt';

/** The four stages, in order (FSRS mapping in §3: Learning/Relearning = sprout, Review = flower, mastered = fruiting). */
export const GROWTH_STAGES = ['seed', 'sprout', 'flower', 'fruiting'] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

const STAGE_ART: Record<GrowthStage, { tint: string; art: React.ReactNode }> = {
  seed: { tint: 'bg-bg', art: <HomeSeed width={52} height={52} /> },
  sprout: { tint: 'bg-[#EEF3EA]', art: <HomeSprout width={56} height={56} /> },
  flower: { tint: 'bg-[#F9EEE6]', art: <HomeFlower width={52} height={67} /> },
  fruiting: { tint: 'bg-[#F7F0DC]', art: <HomeTree width={60} height={76} /> },
};

/** Where the review drops sit on the "Reviews spread out" line (widening gaps, Today → Weeks later). */
const SPREAD_DROPS = [0, 7, 17, 32, 57, 100];

/**
 * Home page v2 HP-7 · How your words grow v2 (G-home notes, reference
 * `H3-home-v2-phone` / `H4-home-v2-desktop`, each also `-vi`). Four stage
 * cards with what the stage means, **Reviews:** and **Grows when:** (the
 * Fruiting card: **Stays that way if:**), arrows between them (a column on
 * the phone with the picture left of the title, a row on desktop); below,
 * the "Reviews spread out" strip and the two tips. The section and its
 * heading come from `HomeScreen`.
 */
export function GrowthStages() {
  const t = useTranslations('screens.home.public.how');
  const card = 'flex flex-col rounded-[22px] border border-solid border-border bg-surface';

  return (
    <>
      <ol className="m-0 flex list-none flex-col gap-1 p-0 home-lg:grid home-lg:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)] home-lg:gap-2">
        {GROWTH_STAGES.map((stage, index) => (
          <React.Fragment key={stage}>
            {index > 0 ? (
              <li aria-hidden="true" className="flex items-center justify-center text-[#9CB79A]">
                <StageArrow direction="down" width={18} height={18} className="block home-lg:hidden" />
                <StageArrow direction="right" width={20} height={20} className="hidden home-lg:block" />
              </li>
            ) : null}
            <li data-stage={stage} className={gcn(card, 'gap-2.5 p-3.5 home-lg:gap-3 home-lg:p-5')}>
              <div className="flex items-center gap-3.5 home-lg:flex-col home-lg:items-stretch home-lg:gap-3">
                <div
                  aria-hidden="true"
                  className={gcn(
                    'box-border flex size-[76px] shrink-0 items-end justify-center rounded-2xl pb-1 home-lg:h-[84px] home-lg:w-auto [&>svg]:block',
                    STAGE_ART[stage].tint,
                  )}
                >
                  {STAGE_ART[stage].art}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-bold uppercase tracking-[.08em] text-gold-text">
                    {t('stage', { n: index + 1 })}
                  </span>
                  <span className="font-display text-[21px] font-semibold leading-[1.15] home-lg:text-[24px]">
                    {t(`stages.${stage}.name`)}
                  </span>
                  <span className="text-[15px] font-semibold leading-[1.4] text-example">{t(`stages.${stage}.means`)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 border-0 border-t border-solid border-divider pt-2.5">
                <StageRow icon={<FeatureWaterIcon width={16} height={16} className="inline align-baseline" />} label={t('reviews')} text={t(`stages.${stage}.reviews`)} />
                <StageRow
                  icon={<GrowUpIcon width={16} height={16} className="inline align-baseline" />}
                  label={stage === 'fruiting' ? t('staysIf') : t('growsWhen')}
                  text={t(`stages.${stage}.grows`)}
                />
              </div>
            </li>
          </React.Fragment>
        ))}
      </ol>

      <div className="flex flex-col gap-2.5 home-lg:grid home-lg:grid-cols-[1.3fr_1fr_1fr] home-lg:gap-4">
        <div className={gcn(card, 'gap-3 p-4 home-lg:p-5')}>
          <span className="text-[16px] font-bold">{t('spread.title')}</span>
          <div aria-hidden="true" className="relative mx-2.5 h-[22px]">
            <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-sm bg-[linear-gradient(90deg,#DCE8D5,#9CB79A)]" />
            {SPREAD_DROPS.map((left) => (
              <span
                key={left}
                style={{ left: `${left}%` }}
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-[7px] bg-water-due shadow-[0_0_0_3px_var(--color-water-soft)]"
              />
            ))}
          </div>
          <div className="flex justify-between text-[12px] font-semibold text-muted-foreground">
            <span>{t('spread.today')}</span>
            <span>{t('spread.later')}</span>
          </div>
          <span className="text-[14px] leading-[1.5] text-[#44524A]">{t('spread.text')}</span>
        </div>
        <Tip
          className="bg-[#EEF5F9]"
          iconClassName="bg-water-soft text-forest"
          icon={<FeatureWaterIcon width={22} height={22} className="block" />}
          title={t('tips.drop.title')}
          text={t('tips.drop.text')}
        />
        <Tip
          className="bg-[#EEF3EA]"
          iconClassName="bg-on-forest-muted"
          icon={<HomeSprout width={30} height={30} className="block" />}
          title={t('tips.forgot.title')}
          text={t('tips.forgot.text')}
        />
      </div>
    </>
  );
}

function StageRow({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <span className="flex items-start gap-2 text-[14px] leading-[1.4]">
      <span className="mt-px shrink-0">{icon}</span>
      <span>
        <b className="font-bold">{label}</b> {text}
      </span>
    </span>
  );
}

function Tip({
  className,
  iconClassName,
  icon,
  title,
  text,
}: {
  className: string;
  iconClassName: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className={gcn('flex items-start gap-3 rounded-[22px] p-4 home-lg:p-5', className)}>
      <span
        aria-hidden="true"
        className={gcn('flex size-11 shrink-0 items-center justify-center rounded-[14px]', iconClassName)}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[16px] font-bold">{title}</span>
        <span className="text-[14px] leading-[1.5] text-[#44524A]">{text}</span>
      </div>
    </div>
  );
}
