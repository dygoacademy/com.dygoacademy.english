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
  HomeFlower,
  HomeSeed,
  HomeSprout,
  HomeStar,
  HomeSun,
  HomeTick,
  HomeTree,
  HomeWateringCan,
  LogoMark,
} from './homeArt';

/** In-page anchors (desktop header nav). */
export const HOME_ANCHORS = {
  features: 'features',
  howItWorks: 'how-it-works',
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
}

const PRIMARY_CTA =
  'box-border inline-flex h-14 items-center justify-center whitespace-nowrap rounded-[18px] bg-primary px-6 text-[17px] font-bold text-white no-underline shadow-[0_4px_0_var(--color-primary-shadow)]';

/** Display headings (Fraunces 600): 28px on the phone, 40px on desktop. */
const SECTION_TITLE = 'm-0 font-display text-[28px] font-semibold leading-[1.1] lg:text-[40px]';

/**
 * Home page HP-1 · the public home page at `/` for signed-out visitors
 * (canvas page "Home page", `reference/H1-home-phone` and
 * `H2-home-desktop`, each also `-vi`). Props only: the copy comes from
 * `screens.home.public.*`, the links from the caller. One tree for both
 * layouts: the phone layout below `lg` (centred, max 560 px, like the
 * garden screens), the desktop layout from `lg` (max 1280 px, 64 px side
 * padding), switched with Tailwind `lg:` classes only.
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
}: HomeScreenProps) {
  const t = useTranslations('screens.home.public');

  return (
    <div className="min-h-dvh bg-bg font-body text-text">
      <div className="mx-auto box-border w-full max-w-[560px] lg:max-w-[1280px]">
        <header className="flex items-center gap-2.5 px-5 py-3.5 lg:gap-8 lg:px-16 lg:py-5">
          <Logo href={homeHref} />
          <nav aria-label={t('nav.label')} className="ml-6 hidden gap-7 lg:flex">
            <a href={`#${HOME_ANCHORS.features}`} className="text-[15px] font-semibold text-text no-underline">
              {t('nav.features')}
            </a>
            <a href={`#${HOME_ANCHORS.howItWorks}`} className="text-[15px] font-semibold text-text no-underline">
              {t('nav.howItWorks')}
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
            className="h-9 whitespace-nowrap"
          />
          <Link
            href={loginHref}
            className="whitespace-nowrap text-[14px] font-bold text-forest no-underline lg:text-[15px]"
          >
            {t('signIn')}
          </Link>
          <Link
            href={registerHref}
            className={gcn(
              PRIMARY_CTA,
              'hidden h-11 rounded-[14px] px-[18px] text-[15px] shadow-[0_3px_0_var(--color-primary-shadow)] lg:inline-flex',
            )}
          >
            {t('createAccount')}
          </Link>
        </header>

        {/* Hero: scene above the text on the phone, text left / scene right on desktop. */}
        <section className="flex flex-col gap-[22px] px-5 pb-10 pt-2 lg:flex-row-reverse lg:items-center lg:gap-14 lg:px-16 lg:pb-16 lg:pt-10">
          <div className="lg:min-w-0 lg:flex-1">
            <HeroScene />
          </div>
          <div className="flex flex-col gap-3.5 lg:min-w-0 lg:flex-1 lg:gap-[18px]">
            <h1 className="m-0 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.01em] lg:text-[60px]">
              {t('hero.title')}
            </h1>
            <p className="m-0 text-[17px] leading-[1.5] text-[#44524A] lg:text-[19px]">{t('hero.lead')}</p>
            <div className="mt-1.5 flex flex-wrap gap-2.5">
              <Link href={registerHref} className={gcn(PRIMARY_CTA, 'w-full lg:w-auto')}>
                {t('hero.start')}
              </Link>
              <Link
                href={loginHref}
                className="hidden h-14 items-center px-[18px] text-[16px] font-bold text-forest no-underline lg:inline-flex"
              >
                {t('hero.haveAccount')}
              </Link>
            </div>
            <span className="flex items-center gap-2 text-[14px] text-muted-foreground">
              <GlobeIcon width={16} height={16} />
              {t('hero.languages')}
            </span>
          </div>
        </section>

        <section
          id={HOME_ANCHORS.howItWorks}
          className="flex scroll-mt-4 flex-col gap-[22px] px-5 py-9 lg:gap-8 lg:p-16"
        >
          <div className="mx-auto flex max-w-[720px] flex-col items-center gap-2 text-center">
            <h2 className={SECTION_TITLE}>{t('how.title')}</h2>
            <p className="m-0 text-[16px] leading-[1.5] text-muted-foreground lg:text-[18px]">{t('how.lead')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-5">
            <StageCard n={1} art={<HomeSeed width={52} height={52} />} name={t('how.seed.name')} text={t('how.seed.text')} />
            <StageCard n={2} art={<HomeSprout width={56} height={56} />} name={t('how.sprout.name')} text={t('how.sprout.text')} />
            <StageCard n={3} art={<HomeFlower width={52} height={67} />} name={t('how.flower.name')} text={t('how.flower.text')} />
            <StageCard n={4} art={<HomeTree width={60} height={76} />} name={t('how.fruiting.name')} text={t('how.fruiting.text')} />
          </div>
        </section>

        <section
          id={HOME_ANCHORS.features}
          className="flex scroll-mt-4 flex-col gap-[22px] px-5 pb-9 pt-3 lg:gap-8 lg:px-16 lg:pb-16 lg:pt-8"
        >
          <div className="mx-auto flex max-w-[720px] flex-col items-center gap-2 text-center">
            <h2 className={SECTION_TITLE}>{t('features.title')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3 lg:gap-5">
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
          className="mx-5 flex scroll-mt-4 flex-col-reverse gap-[22px] rounded-[32px] border border-border bg-surface px-[18px] py-[22px] lg:mx-16 lg:flex-row lg:items-center lg:gap-12 lg:p-12"
        >
          <div className="flex flex-col gap-3.5 lg:min-w-0 lg:flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[12px] font-bold uppercase tracking-[.1em] text-primary">{t('parents.overline')}</span>
              <span className="rounded-full border border-gold-border bg-gold-soft px-2.5 py-[3px] text-[12px] font-bold text-gold-soft-text">
                {t('parents.soon')}
              </span>
            </div>
            <h2 className={SECTION_TITLE}>{t('parents.title')}</h2>
            <p className="m-0 text-[16px] leading-[1.5] text-muted-foreground lg:text-[18px]">{t('parents.lead')}</p>
            <ul className="m-0 mt-1 flex list-none flex-col gap-2.5 p-0">
              {(['pictures', 'faces', 'stars', 'account'] as const).map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-[15px] leading-[1.45] lg:text-[16px]">
                  <span className="mt-0.5 shrink-0">
                    <HomeStar width={18} height={18} className="block" />
                  </span>
                  <span>{t(`parents.points.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <KidsCard prompt={t('parents.kidsPrompt')} hint={t('parents.kidsHint')} />
        </section>

        <section className="flex flex-col gap-4 px-5 py-9 lg:flex-row lg:gap-6 lg:p-16">
          <Fact value={t('facts.minutes.value')} label={t('facts.minutes.label')} />
          <Fact value={t('facts.missions.value')} label={t('facts.missions.label')} />
          <Fact value={t('facts.languages.value')} label={t('facts.languages.label')} />
        </section>

        <section className="relative mx-5 flex flex-col gap-[18px] overflow-hidden rounded-[32px] bg-forest px-5 py-7 text-white lg:mx-16 lg:flex-row lg:items-center lg:gap-10 lg:px-14 lg:py-12">
          <div className="flex flex-col gap-2 lg:flex-1">
            <h2 className={SECTION_TITLE}>{t('cta.title')}</h2>
            <p className="m-0 text-[16px] text-sprout-border lg:text-[18px]">{t('cta.lead')}</p>
          </div>
          <div aria-hidden="true" className="flex items-end gap-2">
            <HomeSeed width={44} height={44} className="block" />
            <HomeSprout width={48} height={48} className="block" />
            <HomeFlower width={44} height={57} className="block" />
          </div>
          <Link href={registerHref} className={gcn(PRIMARY_CTA, 'w-full lg:w-auto')}>
            {t('cta.button')}
          </Link>
        </section>

        <footer className="flex flex-col gap-3 px-5 py-7 text-[14px] text-muted-foreground lg:flex-row lg:items-center lg:gap-5 lg:px-16 lg:py-10">
          <Logo href={homeHref} />
          <div className="hidden grow lg:block" />
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

/** The hero scene: sun, watering can with drops, seed → fruiting tree. 200 px tall on the phone, 300 on desktop. */
function HeroScene() {
  const drop = 'block h-[9px] w-1.5 rounded-[3px] bg-[#8EC5E8]';
  return (
    <div
      aria-hidden="true"
      className="relative h-[200px] overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#2C5345_0%,#24463A_100%)] lg:h-[300px]"
    >
      <div className="absolute right-[18px] top-3.5 lg:right-[30px] lg:top-[22px]">
        <HomeSun className="block size-14 lg:size-[75px]" />
      </div>
      <div className="absolute left-[18px] top-[34px] -rotate-12 lg:left-10 lg:top-[54px]">
        <HomeWateringCan className="block size-[70px] lg:size-[94px]" />
      </div>
      <div className="absolute left-[70px] top-[74px] flex gap-2.5 lg:left-[110px] lg:top-[108px]">
        <span className={drop} />
        <span className={drop} />
        <span className={drop} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[34px] bg-[#1B362C] lg:h-[46px]" />
      <div className="absolute inset-x-0 bottom-[22px] flex items-end justify-center gap-2.5 lg:bottom-[30px] lg:gap-[26px]">
        <HomeSeed className="block size-10 lg:size-[54px]" />
        <HomeSprout className="block size-[46px] lg:size-[62px]" />
        <HomeFlower className="block h-[57px] w-[44px] lg:h-[76px] lg:w-[59px]" />
        <HomeTree className="block h-[73px] w-[58px] lg:h-[99px] lg:w-[78px]" />
        <HomeFlower className="block h-[49px] w-[38px] lg:h-[66px] lg:w-[51px]" />
        <HomeSprout className="block size-10 lg:size-[54px]" />
      </div>
    </div>
  );
}

function StageCard({ n, art, name, text }: { n: number; art: React.ReactNode; name: string; text: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[22px] border border-border bg-surface p-4 lg:p-[22px]">
      <div aria-hidden="true" className="flex h-20 items-end justify-center rounded-2xl bg-bg pb-1 [&>svg]:block">
        {art}
      </div>
      <span className="text-[12px] font-bold text-gold-text">{n}</span>
      <span className="font-display text-[19px] font-semibold lg:text-[22px]">{name}</span>
      <span className="text-[14px] leading-[1.45] text-muted-foreground lg:text-[15px]">{text}</span>
    </div>
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
    <div className="flex flex-row gap-3.5 rounded-[22px] border border-border bg-surface p-[18px] lg:flex-col lg:p-6">
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
        <span className="text-[17px] font-bold lg:text-[19px]">{title}</span>
        <span className="text-[14px] leading-[1.5] text-muted-foreground lg:text-[15px]">{text}</span>
      </div>
    </div>
  );
}

/** The kids preview: stars, the bee, Dygo's prompt and two picture answers (the cat is right). */
function KidsCard({ prompt, hint }: { prompt: string; hint: string }) {
  const tile = 'flex h-24 items-center justify-center rounded-[24px] border-[3px] lg:h-[120px]';
  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-[30px] bg-[#FFF8EC] p-[18px] lg:min-w-0 lg:flex-1 lg:p-7">
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
          {/* Baloo 2 is the kids' font (canvas); the body stack is the fallback. */}
          <span className="[font-family:'Baloo_2',var(--font-stack-body)] text-[24px] font-extrabold leading-[1.05] text-[#2E2A26]">
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

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 lg:flex-1 lg:text-center">
      <span className="font-display text-[24px] font-semibold text-forest lg:text-[30px]">{value}</span>
      <span className="text-[14px] text-muted-foreground">{label}</span>
    </div>
  );
}
