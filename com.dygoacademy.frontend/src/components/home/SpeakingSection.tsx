'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { MicIcon, SpeakerIcon } from '@/components/garden/icons';

import { SpeakDemo, type SpeakDemoState } from './SpeakDemo';
import { HomeFlower } from './homeArt';

export const SPEAK_STEPS = ['listen', 'say', 'compare'] as const;

const STEP_ICON: Record<(typeof SPEAK_STEPS)[number], React.ReactNode> = {
  listen: <SpeakerIcon width={20} height={20} />,
  say: <MicIcon width={20} height={20} />,
  compare: <HomeFlower width={20} height={26} />,
};

/**
 * Home page · "Hear it. Say it. Watch it bloom." (CHANGELOG 2026-10-07,
 * H3 / H4 `#speak`), after How your words grow. Phone: heading, demo
 * card, the three steps and the privacy line. Desktop: heading, steps and
 * privacy left, demo card right.
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
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {SPEAK_STEPS.map((step, index) => (
        <li key={step} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary"
          >
            {STEP_ICON[step]}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] font-bold home-lg:text-[17px]">
              {index + 1}. {t(`steps.${step}.title`)}
            </span>
            <span className="text-[14px] leading-[1.5] text-muted-foreground home-lg:text-[15px]">
              {t(`steps.${step}.text`)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <section
      id={id}
      className="flex scroll-mt-4 flex-col gap-5 px-5 pb-9 pt-5 home-lg:flex-row home-lg:items-center home-lg:gap-14 home-lg:px-16 home-lg:pb-16 home-lg:pt-10"
    >
      <div className="flex flex-col gap-5 home-lg:min-w-0 home-lg:flex-1 home-lg:gap-6">
        <div className="flex flex-col gap-2 text-center home-lg:text-left">
          <span className="text-[12px] font-bold uppercase tracking-[.1em] text-primary">{t('overline')}</span>
          <h2 className="m-0 font-display text-[28px] font-semibold leading-[1.1] home-lg:text-[40px]">{t('title')}</h2>
          <p className="m-0 text-[16px] leading-[1.5] text-muted-foreground home-lg:text-[18px]">{t('lead')}</p>
        </div>
        <div className="hidden flex-col gap-5 home-lg:flex">
          {steps}
          <Privacy text={t('privacy')} />
        </div>
      </div>
      <div className="home-lg:min-w-0 home-lg:flex-1">
        <SpeakDemo registerHref={registerHref} initialState={demoState} />
      </div>
      <div className="flex flex-col gap-4 home-lg:hidden">
        {steps}
        <Privacy text={t('privacy')} />
      </div>
    </section>
  );
}

function Privacy({ text }: { text: string }) {
  return (
    <p className="m-0 flex items-start gap-2 text-[14px] leading-[1.45] text-muted-foreground">
      <span aria-hidden="true">🔒</span>
      {text}
    </p>
  );
}
