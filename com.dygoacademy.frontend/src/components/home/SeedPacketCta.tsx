'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '@/components/garden/cn';

import { SeedPacketArt } from './homeArt';
import { saveHref } from './PlantAWord';

/** `sessionStorage` key: the last word planted in the hero this visit. */
export const PLANTED_WORD_KEY = 'dygo_home_planted_word';

/** Remember the word planted in the hero for this visit (tab). Storage may be blocked: then it's just not kept. */
export function rememberPlantedWord(word: string) {
  try {
    window.sessionStorage.setItem(PLANTED_WORD_KEY, word);
  } catch {
    // Private mode, blocked storage: the CTA goes to plain /register.
  }
}

/** The word planted in the hero earlier this visit, if any. */
export function readPlantedWord(): string | undefined {
  try {
    return window.sessionStorage.getItem(PLANTED_WORD_KEY)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** `/register`, or `/register?seed=<word>` once a word was planted this visit. */
export function seedCtaHref(registerHref: string, plantedWord?: string) {
  const word = plantedWord?.trim();
  return word ? saveHref(registerHref, word) : registerHref;
}

export interface SeedPacketCtaProps {
  registerHref: string;
  loginHref: string;
  /** The word planted in the hero this visit (HomeScreen keeps it in `sessionStorage`). */
  plantedWord?: string;
}

const PRIMARY_CTA =
  'box-border inline-flex h-14 items-center justify-center whitespace-nowrap rounded-[18px] bg-primary px-6 text-[17px] font-bold text-white no-underline shadow-[0_4px_0_var(--color-primary-shadow)]';

/**
 * Home page HP-9 · the seed packet call to action (canvas page "Home page
 * v2", `reference/H3-home-v2-phone`, `H4-home-v2-desktop`, each also
 * `-vi`), replacing the v1 forest call to action. Packet above the text on
 * the phone, packet left / text right on desktop ("I already have an
 * account" on desktop only). Hover or focus anywhere in the section tears
 * the packet open (CSS only, `SeedPacketArt`) and tips the Free tag; the
 * link navigates at once.
 */
export function SeedPacketCta({ registerHref, loginHref, plantedWord }: SeedPacketCtaProps) {
  const t = useTranslations('screens.home.public');

  return (
    <section className="group mx-5 box-border flex flex-col items-center gap-[22px] overflow-hidden rounded-[32px] border border-border bg-surface px-5 py-7 home-lg:mx-16 home-lg:flex-row home-lg:gap-14 home-lg:px-16 home-lg:py-12">
      <div className="flex justify-center rounded-[26px] bg-[#EFE7D3] px-11 py-[22px] home-lg:px-[52px] home-lg:py-7">
        <div className="relative h-[183px] w-[150px] shrink-0 home-lg:h-[207px] home-lg:w-[170px]">
          <SeedPacketArt className="block h-full w-full" />
          <span
            className={gcn(
              'absolute right-[-18px] top-[22px] rotate-12 rounded-[10px] bg-[#E0B04A] px-3.5 py-1.5 text-[15px] font-extrabold text-[#3D2E06] shadow-[0_3px_0_#B8892A]',
              'transition-transform duration-200 group-focus-within:-translate-y-0.5 group-focus-within:rotate-[4deg] group-hover:-translate-y-0.5 group-hover:rotate-[4deg] motion-reduce:transition-none',
            )}
          >
            {t('cta.free')}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2.5 text-center home-lg:min-w-0 home-lg:flex-1 home-lg:items-stretch home-lg:text-left">
        <span className="text-[12px] font-bold uppercase tracking-[.1em] text-[#3E7F5A]">{t('cta.overline')}</span>
        <h2 className="m-0 font-display text-[30px] font-semibold leading-[1.08] home-lg:text-[44px]">{t('cta.title')}</h2>
        <div className="mt-2.5 flex w-full flex-col gap-2.5 home-lg:w-auto home-lg:flex-row">
          <Link href={seedCtaHref(registerHref, plantedWord)} className={gcn(PRIMARY_CTA, 'w-full home-lg:w-auto')}>
            {t('cta.button')}
          </Link>
          <Link
            href={loginHref}
            className="hidden h-14 items-center px-[18px] text-[16px] font-bold text-forest no-underline home-lg:inline-flex"
          >
            {t('hero.haveAccount')}
          </Link>
        </div>
      </div>
    </section>
  );
}
