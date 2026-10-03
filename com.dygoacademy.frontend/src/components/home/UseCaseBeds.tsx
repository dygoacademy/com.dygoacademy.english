'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '@/components/garden/cn';
import { isMeaningLocale, type AppLocale } from '@/i18n/config';

import {
  AddWordPlusIcon,
  HomeFlower,
  HomeSeed,
  HomeSprout,
  HomeTree,
  UseDailyIcon,
  UseOwnIcon,
  UseStudyIcon,
  UseTravelIcon,
  UseWorkIcon,
} from './homeArt';
import {
  USE_CASE_BED_KEYS,
  findUseCaseBed,
  type UseCaseBedKey,
  type UseCasePlantStage,
} from './useCaseWords';

const TAB_ICON: Record<UseCaseBedKey, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  work: UseWorkIcon,
  study: UseStudyIcon,
  travel: UseTravelIcon,
  daily: UseDailyIcon,
  own: UseOwnIcon,
};

/** The plant on a word tile, at the canvas sizes. */
function TilePlant({ stage }: { stage: UseCasePlantStage }) {
  switch (stage) {
    case 'tree':
      return <HomeTree width={32} height={40} className="block" />;
    case 'flower':
      return <HomeFlower width={32} height={41} className="block" />;
    case 'sprout':
      return <HomeSprout width={40} height={40} className="block" />;
    default:
      return <HomeSeed width={40} height={40} className="block" />;
  }
}

export interface UseCaseBedsProps {
  /** The page language: vi-VN / zh-CN show a meaning line under each word, en-US doesn't. */
  locale: AppLocale;
  /** Where "Start with these words" goes (`/register`). */
  registerHref: string;
  /** The selected bed at first (default Work; the H3s-uses-travel fixture picks `travel`). */
  initialBed?: UseCaseBedKey;
  /**
   * AI fill-in is live on UAT: the "My own words" line then says Dygo adds the
   * meaning and examples (decision 15). Off until Dylan confirms it on UAT.
   */
  aiFill?: boolean;
}

/**
 * Home page v2 HP-8 · "What do you need English for?" (references
 * `H3-home-v2-phone`, `H4-home-v2-desktop`, `H3s-uses-travel`, each also
 * `-vi`). A `tablist` of five beds (arrow keys, Home and End move the
 * selection; the selected tab is the only one in the tab order) and one
 * `tabpanel`: a wooden sign with the bed name, a "Coming soon" badge on beds
 * that aren't seeded yet, the bed with 5 plant tiles (3 per row on the phone,
 * 5 on desktop) and a line + "Start with these words" → `/register`.
 */
export function UseCaseBeds({ locale, registerHref, initialBed = 'work', aiFill = false }: UseCaseBedsProps) {
  const t = useTranslations('screens.home.public.uses');
  const [selected, setSelected] = React.useState<UseCaseBedKey>(initialBed);
  const tabRefs = React.useRef<Partial<Record<UseCaseBedKey, HTMLButtonElement | null>>>({});
  const baseId = React.useId();
  const tabId = (key: UseCaseBedKey) => `${baseId}-tab-${key}`;
  const panelId = `${baseId}-panel`;

  function select(key: UseCaseBedKey, focus: boolean) {
    setSelected(key);
    if (focus) tabRefs.current[key]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = USE_CASE_BED_KEYS.indexOf(selected);
    const last = USE_CASE_BED_KEYS.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(USE_CASE_BED_KEYS[next], true);
  }

  const bed = findUseCaseBed(selected);
  const meaningLocale = isMeaningLocale(locale) ? locale : null;
  const line =
    bed.key === 'own'
      ? t(aiFill ? 'beds.own.lineAi' : 'beds.own.line')
      : bed.ready
        ? t(`beds.${bed.key}.line`)
        : `${t(`beds.${bed.key}.line`)} ${t('soonLine')}`;

  return (
    <>
      <div
        role="tablist"
        aria-label={t('title')}
        onKeyDown={onKeyDown}
        className="flex flex-wrap justify-center gap-2"
      >
        {USE_CASE_BED_KEYS.map((key) => {
          const Icon = TAB_ICON[key];
          const isSelected = key === selected;
          return (
            <button
              key={key}
              ref={(el) => {
                tabRefs.current[key] = el;
              }}
              type="button"
              role="tab"
              id={tabId(key)}
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              data-bed={key}
              onClick={() => select(key, false)}
              className={gcn(
                'box-border flex h-10 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[20px] border border-solid px-3.5 font-body text-[14px] font-bold',
                isSelected ? 'border-forest bg-forest text-white' : 'border-border bg-surface text-forest',
              )}
            >
              <Icon width={16} height={16} className="block shrink-0" />
              {t(`beds.${key}.name`)}
            </button>
          );
        })}
      </div>
      <div
        key={bed.key}
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(bed.key)}
        data-bed-panel={bed.key}
        className="rise flex flex-col gap-3.5 rounded-[26px] border border-solid border-border bg-surface p-4 home-lg:p-6"
      >
        <div className="flex items-end justify-between gap-2.5">
          <span className="relative inline-flex flex-col items-center" aria-hidden="true">
            <span className="whitespace-nowrap rounded-[8px] bg-[#A47A57] px-3.5 py-1.5 text-[14px] font-bold text-[#FFF8EC] shadow-[inset_0_-3px_0_#8A6A4F]">
              {t(`beds.${bed.key}.name`)}
            </span>
            <span className="h-3 w-1.5 bg-[#8A6A4F]" />
          </span>
          {!bed.ready && (
            <span className="whitespace-nowrap rounded-full border border-solid border-gold-border bg-gold-soft px-2.5 py-[3px] text-[12px] font-bold text-gold-soft-text">
              {t('soon')}
            </span>
          )}
        </div>
        <ul className="m-0 grid list-none grid-cols-3 gap-2 rounded-[20px] bg-[#E9DFCC] p-2.5 home-lg:grid-cols-5 home-lg:gap-3 home-lg:p-3.5">
          {bed.words.length === 0
            ? Array.from({ length: 5 }, (_, i) => (
                <li
                  key={i}
                  data-empty-tile=""
                  className="flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-[16px] border-[1.5px] border-dashed border-[#C9BCA2] bg-[#FBF8F1] text-[#9A8C70] home-lg:min-h-[120px]"
                >
                  <HomeSeed width={34} height={34} className="block" />
                  <span className="flex items-center gap-1 text-[13px] font-bold">
                    <AddWordPlusIcon width={18} height={18} className="block shrink-0" />
                    {t('addWord')}
                  </span>
                </li>
              ))
            : bed.words.map((entry) => (
                <li
                  key={entry.word}
                  className="box-border flex min-h-[104px] flex-col items-center justify-start gap-1 rounded-[16px] border border-solid border-border bg-surface px-2 py-2.5 text-center home-lg:min-h-[120px]"
                >
                  <span className="flex h-11 items-end">
                    <TilePlant stage={entry.stage} />
                  </span>
                  <span lang="en" className="text-[15px] font-bold">
                    {entry.word}
                  </span>
                  {meaningLocale && (
                    <span data-meaning="" className="text-[13px] leading-[1.3] text-muted-foreground">
                      {entry.meaning[meaningLocale]}
                    </span>
                  )}
                </li>
              ))}
        </ul>
        <div className="flex flex-col gap-3 home-lg:flex-row home-lg:items-center home-lg:justify-between home-lg:gap-5">
          <span className="text-[15px] leading-[1.45] text-[#44524A] home-lg:text-[16px]">{line}</span>
          <Link
            href={registerHref}
            className="box-border inline-flex h-[52px] w-full items-center justify-center whitespace-nowrap rounded-[16px] border border-solid border-border bg-surface px-5 text-[16px] font-bold text-forest no-underline home-lg:w-auto"
          >
            {t('button')}
          </Link>
        </div>
      </div>
    </>
  );
}
