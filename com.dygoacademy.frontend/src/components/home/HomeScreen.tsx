'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LanguageChip } from '@/components/garden/auth/LanguageChip';
import { gcn } from '@/components/garden/cn';
import type { AppLocale } from '@/i18n/config';

import {
  DygoBird,
  FeatureBedsIcon,
  FeatureBloomIcon,
  FeatureGroupIcon,
  FeatureLanguageIcon,
  FeatureQuizIcon,
  FeatureWaterIcon,
  GlobeIcon,
  HomeApple,
  HomeBee,
  HomeCat,
  HomeStar,
  HomeTick,
  LogoMark,
} from './homeArt';
import { GrowthStages } from './GrowthStages';
import { HomeFaq } from './HomeFaq';
import { PainCards, type PainKey } from './PainCards';
import { PlantAWord } from './PlantAWord';
import { readPlantedWord, rememberPlantedWord, SeedPacketCta } from './SeedPacketCta';
import { UseCaseBeds } from './UseCaseBeds';
import type { UseCaseBedKey } from './useCaseWords';

/** In-page anchors (desktop header nav). */
export const HOME_ANCHORS = {
  features: 'features',
  howItWorks: 'how-it-works',
  uses: 'uses',
  questions: 'faq',
  forParents: 'for-parents',
} as const;

export interface HomeScreenProps {
  locale: AppLocale;
  onLanguageChange: (locale: AppLocale) => void;
  /** Where "Start growing" and "Create account" go (`/register`). */
  registerHref: string;
  /** Where "Sign in" and "I have an account" go (`/login`). */
  loginHref: string;
  /** The logo link (`/`). */
  homeHref?: string;
  /** Terms and Privacy: `#` until decision 12. */
  termsHref?: string;
  privacyHref?: string;
  languageBusy?: boolean;
  /** `auto` (default): by window width (`lg`). `phone` / `desktop` force one layout (reference fixtures). */
  layout?: HomeLayout;
  /** HP-6: start the hero demo bloomed with this word (the H3s-plant-bloomed fixture). */
  plantedWord?: string;
  /** HP-7: start with these pain cards flipped (the H3s-pain-flipped fixture). */
  flippedPains?: PainKey[];
  /** HP-8: start with this use-case bed selected (the H3s-uses-travel fixture picks `travel`). */
  useCaseBed?: UseCaseBedKey;
}

export type HomeLayout = 'auto' | 'phone' | 'desktop';

const PRIMARY_CTA =
  'box-border inline-flex h-14 items-center justify-center whitespace-nowrap rounded-[18px] bg-primary px-6 text-[17px] font-bold text-white no-underline shadow-[0_4px_0_var(--color-primary-shadow)]';

/** Display headings (Fraunces 600): 28px on the phone, 40px on desktop. */
const SECTION_TITLE = 'm-0 font-display text-[28px] font-semibold leading-[1.1] home-lg:text-[40px]';

/**
 * Home page HP-1 · the public home page at `/` for signed-out visitors
 * (canvas page "Home page", `reference/H1-home-phone` and
 * `H2-home-desktop`, each also `-vi`). Props only: the copy comes from
 * `screens.home.public.*`, the links from the caller. One tree for both
 * layouts: the phone layout below `lg` (centred, max 560 px, like the
 * garden screens), the desktop layout from `lg` (max 1280 px, 64 px side
 * padding), switched with Tailwind `home-lg:` classes only.
 *
 * HP-2: `home-lg:` (tailwind.config.ts) is `lg:` unless `layout` forces one
 * layout, so the reference fixtures (`H1-home-phone`, `H2-home-desktop`)
 * get the phone or desktop layout whatever the window width.
 */
export function HomeScreen({
  locale,
  onLanguageChange,
  registerHref,
  loginHref,
  homeHref = '/',
  termsHref = '#',
  privacyHref = '#',
  languageBusy,
  layout = 'auto',
  plantedWord,
  flippedPains,
  useCaseBed,
}: HomeScreenProps) {
  const t = useTranslations('screens.home.public');
  // HP-9: the word planted in the hero this visit, for the seed packet CTA (`/register?seed=`).
  // Read after mount (sessionStorage is client-only), so the server HTML stays plain `/register`.
  const [plantedThisVisit, setPlantedThisVisit] = React.useState<string | undefined>();
  React.useEffect(() => setPlantedThisVisit(readPlantedWord()), []);

  function onPlant(word: string) {
    rememberPlantedWord(word);
    setPlantedThisVisit(word);
  }

  return (
    <div data-home-layout={layout} className="min-h-dvh bg-bg font-body text-text">
      <div className="mx-auto box-border w-full max-w-[560px] home-lg:max-w-[1280px]">
        <header className="flex items-center gap-2.5 px-5 py-3.5 home-lg:gap-8 home-lg:px-16 home-lg:py-5">
          <Logo href={homeHref} />
          <nav aria-label={t('nav.label')} className="ml-6 hidden gap-7 home-lg:flex">
            <a href={`#${HOME_ANCHORS.features}`} className="text-[15px] font-semibold text-text no-underline">
              {t('nav.features')}
            </a>
            <a href={`#${HOME_ANCHORS.howItWorks}`} className="text-[15px] font-semibold text-text no-underline">
              {t('nav.howItWorks')}
            </a>
            <a href={`#${HOME_ANCHORS.questions}`} className="text-[15px] font-semibold text-text no-underline">
              {t('nav.questions')}
            </a>
            <a href={`#${HOME_ANCHORS.forParents}`} className="text-[15px] font-semibold text-text no-underline">
              {t('nav.forParents')}
            </a>
          </nav>
          <div className="grow" />
          <LanguageChip
            locale={locale}
            onChange={onLanguageChange}
            disabled={languageBusy}
            className="whitespace-nowrap"
          />
          <Link
            href={loginHref}
            className="whitespace-nowrap text-[14px] font-bold text-forest no-underline home-lg:text-[15px]"
          >
            {t('signIn')}
          </Link>
          <Link
            href={registerHref}
            className={gcn(
              PRIMARY_CTA,
              'hidden h-11 rounded-[14px] px-[18px] text-[15px] shadow-[0_3px_0_var(--color-primary-shadow)] home-lg:inline-flex',
            )}
          >
            {t('createAccount')}
          </Link>
        </header>

        {/*
          Hero v2 "Plant a word" (HP-6, reference H3-home-v2-phone / H4-home-v2-desktop):
          text then the demo on the phone, text left / demo right on desktop. The sign-up
          buttons show on desktop only (G-home).
        */}
        <section className="flex flex-col gap-[18px] px-5 pb-9 pt-1.5 home-lg:flex-row home-lg:items-start home-lg:gap-14 home-lg:px-16 home-lg:pb-16 home-lg:pt-9">
          <div className="flex flex-col gap-3 home-lg:min-w-0 home-lg:flex-1 home-lg:gap-[18px] home-lg:pt-6">
            <h1 className="m-0 font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.01em] home-lg:text-[56px]">
              {t('hero.title')}
            </h1>
            <p className="m-0 text-[16px] leading-[1.5] text-[#44524A] home-lg:text-[19px]">{t('hero.lead')}</p>
            <div className="mt-2 hidden gap-2.5 home-lg:flex">
              <Link href={registerHref} className={PRIMARY_CTA}>
                {t('hero.start')}
              </Link>
              <Link
                href={loginHref}
                className="inline-flex h-14 items-center px-[18px] text-[16px] font-bold text-forest no-underline"
              >
                {t('hero.haveAccount')}
              </Link>
            </div>
            <span className="flex items-center gap-2 text-[14px] text-muted-foreground">
              <GlobeIcon width={16} height={16} />
              {t('hero.languages')}
            </span>
          </div>
          <div className="home-lg:min-w-0 home-lg:flex-1">
            <PlantAWord locale={locale} registerHref={registerHref} initialWord={plantedWord} onPlant={onPlant} />
          </div>
        </section>

        {/* Sound familiar? (HP-7): four pain cards, 2 × 2 on the phone, 4 in a row on desktop. */}
        <section className="flex flex-col gap-5 px-5 pb-9 pt-5 home-lg:gap-7 home-lg:px-16 home-lg:pb-16 home-lg:pt-6">
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-2 text-center">
            <h2 className={SECTION_TITLE}>{t('pains.title')}</h2>
            <p className="m-0 text-[16px] leading-[1.5] text-muted-foreground home-lg:text-[18px]">{t('pains.lead')}</p>
          </div>
          <PainCards initialFlipped={flippedPains} />
        </section>

        {/* How your words grow v2 (HP-7): stage cards, the reviews-spread strip and two tips. */}
        <section
          id={HOME_ANCHORS.howItWorks}
          className="flex scroll-mt-4 flex-col gap-5 px-5 pb-9 pt-5 home-lg:gap-7 home-lg:px-16 home-lg:pb-16 home-lg:pt-10"
        >
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-2 text-center">
            <h2 className={SECTION_TITLE}>{t('how.title')}</h2>
            <p className="m-0 text-[16px] leading-[1.5] text-muted-foreground home-lg:text-[18px]">{t('how.lead')}</p>
          </div>
          <GrowthStages />
        </section>

        {/* What do you need English for? (HP-8): bed tabs, one bed panel; 3 tiles per row on the phone, 5 on desktop. */}
        <section
          id={HOME_ANCHORS.uses}
          className="flex scroll-mt-4 flex-col gap-5 px-5 pb-9 pt-3 home-lg:gap-7 home-lg:px-16 home-lg:pb-16 home-lg:pt-6"
        >
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-2 text-center">
            <h2 className={SECTION_TITLE}>{t('uses.title')}</h2>
            <p className="m-0 text-[16px] leading-[1.5] text-muted-foreground home-lg:text-[18px]">{t('uses.lead')}</p>
          </div>
          <UseCaseBeds locale={locale} registerHref={registerHref} initialBed={useCaseBed} />
        </section>

        <section
          id={HOME_ANCHORS.features}
          className="flex scroll-mt-4 flex-col gap-[22px] px-5 pb-9 pt-3 home-lg:gap-8 home-lg:px-16 home-lg:pb-16 home-lg:pt-6"
        >
          <div className="mx-auto flex max-w-[720px] flex-col items-center gap-2 text-center">
            <h2 className={SECTION_TITLE}>{t('features.title')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 home-lg:grid-cols-3 home-lg:gap-5">
            <FeatureCard icon={<FeatureWaterIcon width={22} height={22} />} tint="water" title={t('features.watering.title')} text={t('features.watering.text')} />
            <FeatureCard icon={<FeatureQuizIcon width={22} height={22} />} title={t('features.quizzes.title')} text={t('features.quizzes.text')} />
            <FeatureCard icon={<FeatureBedsIcon width={22} height={22} />} title={t('features.beds.title')} text={t('features.beds.text')} />
            <FeatureCard icon={<FeatureBloomIcon width={22} height={22} />} title={t('features.missions.title')} text={t('features.missions.text')} />
            <FeatureCard icon={<FeatureGroupIcon width={22} height={22} />} title={t('features.shared.title')} text={t('features.shared.text')} />
            <FeatureCard icon={<FeatureLanguageIcon width={22} height={22} />} title={t('features.language.title')} text={t('features.language.text')} />
          </div>
        </section>

        {/* For parents: kids card above the text on the phone, text left / card right on desktop. */}
        <section
          id={HOME_ANCHORS.forParents}
          className="mx-5 flex scroll-mt-4 flex-col-reverse gap-[22px] rounded-[32px] border border-border bg-surface px-[18px] py-[22px] home-lg:mx-16 home-lg:flex-row home-lg:items-center home-lg:gap-12 home-lg:p-12"
        >
          <div className="flex flex-col gap-3.5 home-lg:min-w-0 home-lg:flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[12px] font-bold uppercase tracking-[.1em] text-primary">{t('parents.overline')}</span>
              <span className="rounded-full border border-gold-border bg-gold-soft px-2.5 py-[3px] text-[12px] font-bold text-gold-soft-text">
                {t('parents.soon')}
              </span>
            </div>
            <h2 className={SECTION_TITLE}>{t('parents.title')}</h2>
            <p className="m-0 text-[16px] leading-[1.5] text-muted-foreground home-lg:text-[18px]">{t('parents.lead')}</p>
            <ul className="m-0 mt-1 flex list-none flex-col gap-2.5 p-0">
              {(['pictures', 'faces', 'stars', 'account'] as const).map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-[15px] leading-[1.45] home-lg:text-[16px]">
                  <span className="mt-0.5 shrink-0">
                    <HomeStar width={18} height={18} className="inline align-baseline" />
                  </span>
                  <span>{t(`parents.points.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <KidsCard prompt={t('parents.kidsPrompt')} hint={t('parents.kidsHint')} />
        </section>

        {/* Common questions (HP-9): one column on the phone, two on desktop. */}
        <section
          id={HOME_ANCHORS.questions}
          className="flex scroll-mt-4 flex-col gap-5 px-5 py-10 home-lg:gap-7 home-lg:p-16"
        >
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-2 text-center">
            <h2 className={SECTION_TITLE}>{t('faq.title')}</h2>
          </div>
          <HomeFaq />
        </section>

        {/* Seed packet call to action (HP-9), replacing the v1 facts row and forest call to action. */}
        <SeedPacketCta registerHref={registerHref} loginHref={loginHref} plantedWord={plantedThisVisit} />

        <footer className="flex flex-col gap-3 px-5 py-7 text-[14px] text-muted-foreground home-lg:flex-row home-lg:items-center home-lg:gap-5 home-lg:px-16 home-lg:py-10">
          <Logo href={homeHref} />
          <div className="hidden grow home-lg:block" />
          <div className="flex gap-5">
            <a href={termsHref} className="text-muted-foreground underline">
              {t('footer.terms')}
            </a>
            <a href={privacyHref} className="text-muted-foreground underline">
              {t('footer.privacy')}
            </a>
          </div>
          <span>{t('footer.copyright')}</span>
        </footer>
      </div>
    </div>
  );
}

function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-text no-underline">
      <LogoMark width={30} height={30} className="block" />
      <span className="font-display text-[24px] font-semibold">Dygo</span>
    </Link>
  );
}

function FeatureCard({
  icon,
  tint = 'leaf',
  title,
  text,
}: {
  icon: React.ReactNode;
  tint?: 'water' | 'leaf';
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-row gap-3.5 rounded-[22px] border border-border bg-surface p-[18px] home-lg:flex-col home-lg:p-6">
      <span
        aria-hidden="true"
        className={gcn(
          'flex size-11 shrink-0 items-center justify-center rounded-[14px] text-forest',
          tint === 'water' ? 'bg-water-soft' : 'bg-on-forest-muted',
        )}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="text-[17px] font-bold home-lg:text-[19px]">{title}</span>
        <span className="text-[14px] leading-[1.5] text-muted-foreground home-lg:text-[15px]">{text}</span>
      </div>
    </div>
  );
}

/** The kids preview: stars, the bee, Dygo's prompt and two picture answers (the cat is right). */
function KidsCard({ prompt, hint }: { prompt: string; hint: string }) {
  const tile = 'flex h-[102px] items-center justify-center rounded-[24px] border-[3px] home-lg:h-[126px]';
  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-[30px] bg-[#FFF8EC] p-[18px] home-lg:min-w-0 home-lg:flex-1 home-lg:p-7">
      <div aria-hidden="true" className="absolute right-[22px] top-[18px]">
        <HomeBee width={48} height={48} className="block" />
      </div>
      <div aria-hidden="true" className="flex gap-1.5">
        <HomeStar width={26} height={26} className="block" />
        <HomeStar width={26} height={26} className="block" />
        <HomeStar width={26} height={26} className="block" />
      </div>
      <div className="flex items-center gap-3 rounded-[24px] bg-white p-3 shadow-[0_3px_0_#F1E3CC]">
        <DygoBird label="Dygo" width={58} height={58} className="block shrink-0" />
        <div className="flex flex-col">
          {/* Baloo 2 is the kids' font (canvas), self-hosted in (garden)/fonts (HP-3). */}
          <span className="[font-family:var(--font-stack-kids)] text-[24px] font-extrabold leading-[1.05] text-[#2E2A26]">
            {prompt}
          </span>
          <span className="text-[14px] text-[#6B625A]">{hint}</span>
        </div>
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3">
        <div className={gcn(tile, 'border-[#F1E3CC] bg-white')}>
          <HomeApple width={70} height={70} className="block" />
        </div>
        <div className={gcn(tile, 'relative border-[#6DB85F] bg-[#EAF6E4]')}>
          <HomeCat width={76} height={76} className="block" />
          <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-[14px] bg-[#3E7F3A]">
            <HomeTick width={16} height={16} className="block" />
          </span>
        </div>
      </div>
    </div>
  );
}
