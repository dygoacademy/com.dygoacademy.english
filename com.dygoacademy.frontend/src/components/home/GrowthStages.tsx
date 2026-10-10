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
import { MemoryChart, MemoryChartLegend } from './MemoryChart';

/** The four stages, in order (FSRS mapping in §3: Learning/Relearning = sprout, Review = flower, mastered = fruiting). */
export const GROWTH_STAGES = ['seed', 'sprout', 'flower', 'fruiting'] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

const STAGE_ART: Record<GrowthStage, { tint: string; art: React.ReactNode }> = {
  seed: { tint: 'bg-bg', art: <HomeSeed width={52} height={52} /> },
  sprout: { tint: 'bg-[#EEF3EA]', art: <HomeSprout width={56} height={56} /> },
  flower: { tint: 'bg-[#F9EEE6]', art: <HomeFlower width={52} height={67} /> },
  fruiting: { tint: 'bg-[#F7F0DC]', art: <HomeTree width={60} height={76} /> },
};


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

      <div className="flex flex-col gap-2.5 home-lg:grid home-lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] home-lg:gap-4">
        <div className={gcn(card, 'gap-3 p-4 home-lg:p-5')}>
          <span className="text-[16px] font-bold">{t('spread.title')}</span>
          {/* Memory chart (canvas 2026-10-10): without review vs with Dygo, reviews at widening gaps. */}
          <div className="flex flex-col gap-2.5">
            <MemoryChartLegend
              withDygo={t('spread.chart.with')}
              withoutReview={t('spread.chart.without')}
              review={t('spread.chart.review')}
            />
            <MemoryChart label={t('spread.chart.label')} />
          </div>
          <div className="flex justify-between text-[12px] font-semibold text-muted-foreground">
            <span>{t('spread.today')}</span>
            <span>{t('spread.later')}</span>
          </div>
          <span className="text-[14px] leading-[1.5] text-[#44524A]">{t('spread.text')}</span>
        </div>
        {/* The two tips as picture cards (canvas 2026-10-10): stacked right of the chart on desktop. */}
        <div className="flex flex-col gap-2.5 home-lg:gap-4">
          <TipCard data-tip="drop" title={t('tips.drop.title')} text={t('tips.drop.text')}>
            <GardenTile word="mitigate" plant="sprout" badge="drop" />
            <GardenTile word="deadline" plant="flower" />
            <GardenTile word="negotiate" plant="sprout" badge="drop" />
          </TipCard>
          <TipCard data-tip="forgot" title={t('tips.forgot.title')} text={t('tips.forgot.text')}>
            <GardenTile word="deadline" plant="flower" badge="forgot" />
            <TileArrow />
            <GardenTile word="deadline" plant="sprout" badge="drop" />
            <TileArrow />
            <GardenTile word="deadline" plant="flower" />
          </TipCard>
        </div>
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

/** A tip card: title, a small picture of the garden, one line of text (same order as the chart card). */
function TipCard({
  title,
  text,
  children,
  ...rest
}: { title: string; text: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className="flex flex-col gap-3 rounded-[22px] border border-solid border-border bg-surface p-4 home-lg:flex-1 home-lg:p-5"
    >
      <span className="text-[16px] font-bold">{title}</span>
      <div aria-hidden="true" className="flex flex-auto gap-2">
        {children}
      </div>
      <span className="text-[14px] leading-[1.5] text-[#44524A]">{text}</span>
    </div>
  );
}

/**
 * One word in a tiny garden bed. `drop`: due today (blue tile, water drop
 * badge). `forgot`: the word was forgotten (faded plant, "?" badge). The
 * words stay English in every language, like the speaking demo sentence.
 */
function GardenTile({ word, plant, badge }: { word: string; plant: 'sprout' | 'flower'; badge?: 'drop' | 'forgot' }) {
  const faded = badge === 'forgot';
  return (
    <div
      data-tile={badge ?? 'plain'}
      className={gcn(
        'relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-[14px] px-1 pb-2 pt-2.5',
        badge === 'drop' ? 'bg-[#EEF5F9]' : 'bg-[#F7F4EC]',
      )}
    >
      <span className={gcn('flex h-10 items-end [&>svg]:block', faded && 'opacity-50')}>
        {plant === 'sprout' ? <HomeSprout width={34} height={34} /> : <HomeFlower width={30} height={39} />}
      </span>
      <span lang="en" className={gcn('text-[13px] font-bold', faded ? 'text-[#9AA39C]' : 'text-[#24463A]')}>
        {word}
      </span>
      {badge === 'drop' ? (
        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-white shadow-[0_0_0_1.5px_#CFE3F0]">
          <FeatureWaterIcon width={12} height={12} className="block" />
        </span>
      ) : null}
      {badge === 'forgot' ? (
        <span className="absolute right-1.5 top-1.5 size-5 rounded-full bg-white text-center text-[12px] font-extrabold leading-5 text-primary shadow-[0_0_0_1.5px_#F0CDBB]">
          ?
        </span>
      ) : null}
    </div>
  );
}

function TileArrow() {
  return (
    <span className="flex flex-none items-center text-[#9CB79A]">
      <StageArrow direction="right" width={16} height={16} className="block" />
    </span>
  );
}
