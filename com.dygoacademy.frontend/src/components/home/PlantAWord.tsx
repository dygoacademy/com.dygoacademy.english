'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '@/components/garden/cn';
import type { AppLocale } from '@/i18n/config';

import { DygoBird, PlantPot, PlantSeedIcon } from './homeArt';
import { findPlantWord, PLANT_CHIP_WORDS, splitExample, type PlantWord } from './plantWords';

export type PlantState = 'idle' | 'planting' | 'sprouting' | 'bloomed';

/** Plan timings: the seed drops in (400 ms), then the sprout grows (600 ms). */
export const PLANT_TIMINGS = { planting: 400, sprouting: 600 } as const;

export interface PlantAWordProps {
  /** The page language: picks the meaning line (vi-VN / zh-CN meaning, en-US definition only). */
  locale: AppLocale;
  /** `/register`; the save button adds `?seed=<word>`. */
  registerHref: string;
  /** Start already bloomed with this word, no animation (the H3s-plant-bloomed fixture). */
  initialWord?: string;
}

const CARD = 'flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-[18px] shadow-[0_6px_0_#E8E1D2]';
const SAVE_CTA =
  'box-border inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-[18px] bg-primary px-6 text-[17px] font-bold text-white no-underline shadow-[0_4px_0_var(--color-primary-shadow)]';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function saveHref(registerHref: string, word: string) {
  return `${registerHref}?seed=${encodeURIComponent(word)}`;
}

/**
 * Home page HP-6 · the hero demo "Plant a word" (canvas page "Home page
 * v2": `reference/H3-home-v2-phone`, `H4-home-v2-desktop`,
 * `H3s-plant-bloomed`, each also `-vi`). A chip or a typed word goes
 * `idle` → `planting` (seed drops, 400 ms) → `sprouting` (sprout grows,
 * 600 ms) → `bloomed` (the word card with Dygo and the save button,
 * `/register?seed=<word>`). Another word starts again from `planting`.
 * Reduced motion skips straight to `bloomed`. Only the 8 pre-made words
 * have a card with a meaning; any other word gets the `plant.unknown`
 * card (no API call). Focus moves to the card heading once it blooms.
 */
export function PlantAWord({ locale, registerHref, initialWord }: PlantAWordProps) {
  const t = useTranslations('screens.home.public.plant');
  const tPos = useTranslations('components.partOfSpeech');
  const [state, setState] = React.useState<PlantState>(initialWord ? 'bloomed' : 'idle');
  const [word, setWord] = React.useState(initialWord?.trim() ?? '');
  const [input, setInput] = React.useState(initialWord ?? '');
  const timers = React.useRef<number[]>([]);
  const focusOnBloom = React.useRef(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const clearTimers = React.useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  React.useEffect(() => clearTimers, [clearTimers]);

  React.useEffect(() => {
    if (state === 'bloomed' && focusOnBloom.current) {
      focusOnBloom.current = false;
      headingRef.current?.focus();
    }
  }, [state, word]);

  function plant(raw: string) {
    const next = raw.trim();
    if (!next) return;
    clearTimers();
    const entry = findPlantWord(next);
    setWord(entry ? entry.word : next);
    focusOnBloom.current = true;
    if (prefersReducedMotion()) {
      setState('bloomed');
      return;
    }
    setState('planting');
    timers.current.push(
      window.setTimeout(() => setState('sprouting'), PLANT_TIMINGS.planting),
      window.setTimeout(() => setState('bloomed'), PLANT_TIMINGS.planting + PLANT_TIMINGS.sprouting),
    );
  }

  const entry = state === 'bloomed' ? findPlantWord(word) : undefined;
  const potClass = 'block h-[93px] w-[112px] home-lg:h-[103px] home-lg:w-[124px]';

  return (
    <div className="flex flex-col gap-3" data-plant-state={state}>
      <div
        aria-hidden="true"
        className="relative flex h-[150px] items-end justify-center overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#E7EFE0_0%,#DCE8D5_100%)] home-lg:h-[170px]"
      >
        <div className="absolute inset-x-0 bottom-0 h-[26px] bg-[#CFE0C6]" />
        {state === 'idle' || state === 'planting' ? (
          <div key={`seed-${state}-${word}`} className="relative mb-2">
            <PlantPot
              stage="seed"
              className={potClass}
              seedClassName={
                state === 'planting'
                  ? 'animate-in fade-in slide-in-from-top-8 duration-[400ms] ease-in motion-reduce:animate-none'
                  : undefined
              }
            />
          </div>
        ) : (
          <div
            key={`bloom-${word}`}
            className={gcn(
              'relative mb-2 origin-bottom',
              state === 'sprouting' &&
                'animate-in fade-in zoom-in-[.6] slide-in-from-bottom-4 duration-[600ms] ease-out motion-reduce:animate-none',
            )}
          >
            <PlantPot stage="bloom" className={potClass} />
          </div>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          plant(input);
        }}
      >
        <label className="box-border flex h-[52px] min-w-0 flex-1 items-center rounded-2xl border border-border bg-surface px-3.5 text-[16px]">
          <span className="sr-only">{t('inputLabel')}</span>
          <input
            type="text"
            lang="en"
            enterKeyHint="go"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={40}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('placeholder')}
            className="w-full min-w-0 border-none bg-transparent p-0 text-[16px] font-semibold text-text outline-none placeholder:font-normal placeholder:text-placeholder"
          />
        </label>
        <button
          type="submit"
          className="flex h-[52px] items-center gap-1.5 rounded-2xl border-none bg-forest px-4 text-[15px] font-bold text-white shadow-[0_4px_0_var(--color-forest-shadow)]"
        >
          <PlantSeedIcon width={20} height={20} className="block" />
          {t('button')}
        </button>
      </form>

      <div role="group" aria-label={t('chipsLabel')} className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="text-[13px] font-semibold text-muted-foreground">
          {t('try')}
        </span>
        {PLANT_CHIP_WORDS.map((chip) => {
          const pressed = state !== 'idle' && word === chip;
          return (
            <button
              key={chip}
              type="button"
              lang="en"
              aria-pressed={pressed}
              onClick={() => {
                setInput(chip);
                plant(chip);
              }}
              className={gcn(
                'h-9 rounded-[18px] border px-3.5 text-[14px] font-bold',
                pressed ? 'border-forest bg-forest text-white' : 'border-border bg-surface text-forest',
              )}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {state === 'bloomed' && word ? (
        <div
          aria-live="polite"
          data-testid="plant-card"
          className={gcn(CARD, 'animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none')}
        >
          {entry ? (
            <WordDetails entry={entry} locale={locale} headingRef={headingRef} posLabel={tPos(entry.pos)} synonymsLabel={t('synonyms')} />
          ) : (
            <>
              <h3
                ref={headingRef}
                tabIndex={-1}
                lang="en"
                className="m-0 break-words font-display text-[30px] font-semibold leading-none outline-none"
              >
                {word}
              </h3>
              <p className="m-0 text-[17px] font-semibold leading-[1.4]">{t('unknown', { word })}</p>
            </>
          )}
          <div className="flex items-center gap-2.5 border-t border-[#EFEAE0] pt-3">
            <DygoBird label="Dygo" width={44} height={44} className="block shrink-0" />
            <span className="flex-1 rounded-[14px_14px_14px_4px] border border-[#EFD9A6] bg-[#FBF4E4] px-3 py-[9px] text-[14px] leading-[1.4] text-[#4A3B12]">
              {t('bird')}
            </span>
          </div>
          <Link href={saveHref(registerHref, entry ? entry.word : word)} className={SAVE_CTA}>
            {t('save')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function WordDetails({
  entry,
  locale,
  headingRef,
  posLabel,
  synonymsLabel,
}: {
  entry: PlantWord;
  locale: AppLocale;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  posLabel: string;
  synonymsLabel: string;
}) {
  const [before, bold, after] = splitExample(entry);
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h3
          ref={headingRef}
          tabIndex={-1}
          lang="en"
          className="m-0 font-display text-[30px] font-semibold leading-none outline-none"
        >
          {entry.word}
        </h3>
        <span lang="en" className="text-[15px] text-muted-foreground">
          {entry.ipa}
        </span>
        <span className="rounded-[10px] bg-bg px-[9px] py-[3px] text-[12px] font-semibold text-muted-foreground">
          {posLabel}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {locale === 'en-US' ? (
          <span lang="en" className="text-[17px] font-semibold leading-[1.4]">
            {entry.definition}
          </span>
        ) : (
          <>
            <span className="text-[18px] font-bold leading-[1.35]">{entry.meaning[locale]}</span>
            <span lang="en" className="text-[15px] leading-[1.4] text-muted-foreground">
              {entry.definition}
            </span>
          </>
        )}
      </div>
      <div
        lang="en"
        className="rounded-[14px] bg-surface-sunken px-3.5 py-[11px] font-display text-[16px] leading-[1.45] text-[#2E3A33]"
      >
        “{before}
        <b className="font-bold text-forest">{bold}</b>
        {after}”
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">{synonymsLabel}</span>
        {entry.synonyms.map((synonym) => (
          <span
            key={synonym}
            lang="en"
            className="rounded-2xl border border-[#C9D8C4] px-3 py-[5px] text-[14px] font-semibold text-forest"
          >
            {synonym}
          </span>
        ))}
      </div>
    </>
  );
}
