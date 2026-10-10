'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { MicGlyph, SpeakDemo, type SpeakDemoState } from './SpeakDemo';

export const SPEAK_STEPS = ['listen', 'say', 'compare'] as const;

/** Step tiles as on the canvas: green, clay, green. */
const STEP_TILE: Record<(typeof SPEAK_STEPS)[number], string> = {
  listen: 'bg-[#DDE7DA] text-forest',
  say: 'bg-[#F8E6DC] text-primary',
  compare: 'bg-[#DDE7DA] text-forest',
};

const STEP_ICON: Record<(typeof SPEAK_STEPS)[number], React.ReactNode> = {
  listen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14 V12 A8 8 0 0 1 20 12 V14" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </svg>
  ),
  say: <MicGlyph size={20} />,
  compare: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 12 H5 M7 8 V16 M11 5 V19 M15 9 V15 M19 11 V13" />
    </svg>
  ),
};

/**
 * Home page · "How to practise English speaking by yourself" (canvas page
 * "Landing Page", `#speak`, rebuilt from the boards 2026-10-10). Phone: the
 * New · Speaking pill, heading and lead centred, the demo card, the three
 * steps and the closing line. Desktop: pill, heading, lead, steps and closing
 * line on the left, the 580px demo card on the right.
 */
export function SpeakingSection({
  id,
  registerHref,
  demoState,
}: {
  id: string;
  registerHref: string;
  demoState?: SpeakDemoState;
}) {
  const t = useTranslations('screens.home.public.speak');

  const steps = (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0 home-lg:gap-3.5">
      {SPEAK_STEPS.map((step, index) => (
        <li key={step} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`flex size-10 shrink-0 items-center justify-center rounded-[13px] ${STEP_TILE[step]}`}
          >
            {STEP_ICON[step]}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[16px] font-bold home-lg:text-[17px]">
              {index + 1}. {t(`steps.${step}.title`)}
            </span>
            <span className="text-[14px] leading-[1.45] text-muted-foreground home-lg:text-[15px]">
              {t(`steps.${step}.text`)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <section
      id={id}
      className="flex scroll-mt-4 flex-col gap-[18px] bg-[linear-gradient(180deg,#F4F1EA_0%,#F1E9DD_100%)] px-5 pb-9 pt-7 home-lg:flex-row home-lg:items-center home-lg:gap-14 home-lg:px-16 home-lg:pb-16 home-lg:pt-10"
    >
      <div className="flex flex-col items-center gap-2.5 text-center home-lg:min-w-0 home-lg:flex-1 home-lg:items-stretch home-lg:gap-[18px] home-lg:text-left">
        <span className="inline-flex h-7 items-center gap-1.5 self-center rounded-[14px] bg-[#F8E6DC] px-3 text-[12px] font-extrabold uppercase tracking-[.08em] text-primary home-lg:self-start">
          <MicGlyph size={14} />
          {t('overline')}
        </span>
        <h2 className="m-0 font-display text-[28px] font-semibold leading-[1.1] home-lg:text-[40px]">{t('title')}</h2>
        <p className="m-0 text-[16px] leading-[1.5] text-muted-foreground home-lg:text-[18px] home-lg:text-[#44524A]">
          {t('lead')}
        </p>
        <div className="hidden flex-col gap-[18px] home-lg:flex">
          {steps}
          <p className="m-0 text-[15px] leading-[1.5] text-muted-foreground">{t('grows')}</p>
        </div>
      </div>
      <div className="home-lg:min-w-0 home-lg:flex-[0_0_580px]">
        <SpeakDemo registerHref={registerHref} initialState={demoState} />
      </div>
      <div className="contents home-lg:hidden">
        {steps}
        <p className="m-0 text-center text-[14px] leading-[1.5] text-muted-foreground">{t('grows')}</p>
      </div>
    </section>
  );
}
