import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '../cn';
import { useGardenFormat } from '../format';
import { ChevronRightIcon, RainBarrelIcon, SeedPackIcon } from '../icons';
import { WeekHarvest, type HarvestDay } from '../WeekHarvest';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A4 · Weekly harvest (canvas `reference/A4-weekly-harvest`). Props only.
 *
 * The week's plants (one per day, grown by missions done) with the seed
 * pack they unlock → the vocabulary goal → streak freezes and the study
 * group → tab bar. Missions, freezes and goals arrive with UI-6, and until
 * then their block shows "coming soon". NAV-1: the group card links to that
 * group's garden; without a group there is no card.
 */
export type AvatarTone = 'flower' | 'sprout' | 'due' | 'more';

export interface WeeklyHarvestScreenProps {
  /** First calendar day of the week (format.ts), shown as "Week of 21 September". */
  weekStart: Date;
  harvest: {
    done: number;
    total: number;
    /** The week's calendar days in the locale's order. */
    days: ReadonlyArray<Omit<HarvestDay, 'plantLabel' | 'label'> & { day: Date }>;
    seedPack: { name: string; need: number; have: number } | null;
  } | null;
  goal: {
    /** The target band ("Road to Band 7"). */
    band: number;
    mastered: number;
    target: number;
    growing: number;
    /** The projected day, 'pending' while it can't be worked out yet; null hides "At this pace". */
    eta: Date | 'pending' | null;
  } | null;
  freezes: number | null;
  /** The learner's study group; null hides the card. */
  group: {
    name: string;
    /** The group's garden (`/groups/[id]`); without it the card is not a link. */
    href?: string;
    watered: number;
    members: number;
    /** Words in the group's shared beds. */
    sharedWords: number;
    /** Initials; the live page has none (aggregates only), so the row is left out. */
    avatars: ReadonlyArray<{ text: string; tone: AvatarTone }>;
  } | null;
  /**
   * Phase 13 Sound Garden card (notes §14): shown when the learner has at
   * least SOUND_GARDEN_MIN_ITEMS words with speaking audio; links to The
   * Pond. Left out (undefined / null) on the canvas reference page.
   */
  soundGarden?: { itemCount: number; href: string } | null;
  stickyNav?: boolean;
}

const AVATAR: Record<AvatarTone, string> = {
  flower: 'bg-stage-flower text-avatar-flower-text',
  sprout: 'bg-stage-sprout-leaf text-avatar-sprout-text',
  due: 'bg-stage-due text-avatar-due-text',
  more: 'bg-track text-muted-foreground',
};

const GROUP_CARD =
  'flex flex-col gap-1.5 rounded-card border border-border bg-surface p-[14px] text-text';

/** A lotus on the pond: The Pond's mark on the Sound Garden card. */
function PondIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <ellipse cx="20" cy="29" rx="17" ry="6" fill="var(--color-water-soft)" />
      <path d="M20 28 C14 27 11 22 13 17 C17 18 20 22 20 28 Z" fill="var(--stage-flower)" />
      <path d="M20 28 C26 27 29 22 27 17 C23 18 20 22 20 28 Z" fill="var(--stage-flower)" />
      <path d="M20 28 C17 23 17 16 20 11 C23 16 23 23 20 28 Z" fill="var(--color-gold-light)" />
    </svg>
  );
}

function ComingSoon({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-muted-foreground">{children}</p>;
}

export function WeeklyHarvestScreen({
  weekStart,
  harvest,
  goal,
  freezes,
  group,
  soundGarden,
  stickyNav = true,
}: WeeklyHarvestScreenProps) {
  const t = useTranslations('screens.harvest');
  const speak = useTranslations('screens.speak.soundGarden');
  const f = useGardenFormat();

  const masteredPct = goal && goal.target > 0 ? Math.round((goal.mastered / goal.target) * 100) : 0;
  const growingPct = goal && goal.target > 0 ? Math.round((goal.growing / goal.target) * 100) : 0;

  const groupCard = group ? (
    <>
      {group.avatars.length > 0 ? (
        <div aria-hidden="true" className="flex">
          {group.avatars.map((avatar, index) => (
            <span
              key={index}
              className={gcn(
                'box-content flex h-7 w-7 items-center justify-center rounded-[14px] border-2 border-surface text-[11px] font-bold',
                index > 0 && '-ml-2',
                AVATAR[avatar.tone],
              )}
            >
              {avatar.text}
            </span>
          ))}
        </div>
      ) : null}
      <span className="text-[15px] font-bold">{group.name}</span>
      <span className="text-[12px] leading-[1.35] text-muted-foreground">
        {t('groupBody', {
          watered: group.watered,
          members: group.members,
          words: group.sharedWords,
        })}
      </span>
    </>
  ) : null;

  return (
    <div className={gcn(SCREEN_CLASSES, IPAD_NAV_COLUMN, 'gap-[14px] pt-[22px]')}>
      <header className="flex flex-col px-5">
        <span className="text-[13px] font-medium text-muted-foreground">
          {t('weekOf', { date: f.dayMonth(weekStart) })}
        </span>
        <h1 className="font-display text-[28px] font-semibold leading-[1.1]">{t('title')}</h1>
      </header>

      {soundGarden ? (
        <Link
          href={soundGarden.href}
          data-testid="sound-garden-card"
          className="mx-4 flex items-center gap-3 rounded-card border border-border bg-surface p-[14px] text-text"
        >
          <PondIcon />
          <span className="flex flex-grow flex-col gap-0.5">
            <span className="text-[15px] font-bold">{speak('title')}</span>
            <span className="text-[12px] leading-[1.35] text-muted-foreground">
              {speak('body')}
            </span>
            <span className="text-[13px] font-semibold text-forest">
              {speak('pond')} · {speak('pondBody', { n: soundGarden.itemCount })}
            </span>
          </span>
          <ChevronRightIcon
            width={20}
            height={20}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
        </Link>
      ) : null}

      <section className="mx-4 flex flex-col gap-3 rounded-[24px] bg-forest p-4 text-on-forest">
        {harvest ? (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-bold">
                {t('missionsCount', {
                  done: harvest.done,
                  total: harvest.total,
                })}
              </h2>
              <span className="text-[12px] text-stage-sprout">{t('missionsHint')}</span>
            </div>
            <WeekHarvest
              days={harvest.days.map((day) => ({
                ...day,
                label: day.today ? t('today') : f.weekdayShort(day.day),
                plantLabel: t('dayPlant', { count: day.missions }),
              }))}
            />
            {harvest.seedPack ? (
              <div className="flex items-center gap-2.5 rounded-[14px] bg-forest-deep px-3 py-2.5">
                <SeedPackIcon width={28} height={28} />
                <span className="flex-grow text-[13px] text-on-forest-muted">
                  {t.rich('seedPack', {
                    need: harvest.seedPack.need,
                    name: harvest.seedPack.name,
                    b: (c) => <b className="whitespace-nowrap text-gold-light">{c}</b>,
                  })}
                </span>
                <span className="text-[13px] font-bold text-gold-light">
                  {t('seedPackCount', {
                    have: harvest.seedPack.have,
                    need: harvest.seedPack.need,
                  })}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h2 className="text-[15px] font-bold">{t('missionsTitle')}</h2>
            <p className="text-[13px] text-on-forest-muted">{t('missionsComingSoon')}</p>
          </>
        )}
      </section>

      {/*
        Design system §10, A4: under the full-width harvest, iPad portrait
        puts the goal beside the rain barrel + group (2 columns), landscape
        gives goal, barrel and group a column each (3 columns).
      */}
      <div className="contents ipad:mx-4 ipad:grid ipad:grid-cols-2 ipad:gap-[14px] ipad-lg:grid-cols-3">
        <section className="mx-4 flex flex-col gap-2.5 rounded-[22px] border border-border bg-surface p-4 ipad:mx-0">
          {goal ? (
            <>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-[19px] font-semibold">
                  {t('goalBand', { band: goal.band })}
                </h2>
                <span className="text-[13px] text-muted-foreground">{t('goalHint')}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[32px] font-semibold text-forest">
                  {f.number(goal.mastered)}
                </span>
                <span className="text-[14px] text-muted-foreground">
                  {t('goalMastered', { target: goal.target })}
                </span>
              </div>
              <div
                role="img"
                aria-label={t('goalBar', {
                  mastered: goal.mastered,
                  growing: goal.growing,
                  target: goal.target,
                })}
                className="flex h-2.5 overflow-hidden rounded-[5px] bg-track"
              >
                <div className="bg-success" style={{ width: `${masteredPct}%` }} />
                <div className="bg-stage-sprout" style={{ width: `${growingPct}%` }} />
              </div>
              <div className="flex gap-[14px] text-[12px] text-muted-foreground">
                <span className="flex items-center gap-[5px]">
                  <span aria-hidden="true" className="h-2 w-2 rounded-[4px] bg-success" />
                  {t('legendMastered')}
                </span>
                <span className="flex items-center gap-[5px]">
                  <span aria-hidden="true" className="h-2 w-2 rounded-[4px] bg-stage-sprout" />
                  {t('legendGrowing', { count: goal.growing })}
                </span>
                {goal.eta ? (
                  <span className="ml-auto">
                    {t('eta', {
                      eta: goal.eta === 'pending' ? t('etaPending') : f.dayMonth(goal.eta),
                    })}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-[19px] font-semibold">{t('goalTitle')}</h2>
              <ComingSoon>{t('goalComingSoon')}</ComingSoon>
            </>
          )}
        </section>

        <div className="mx-4 grid grid-cols-2 gap-2.5 ipad:mx-0 ipad-lg:contents">
          <div className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-[14px]">
            <RainBarrelIcon width={30} height={30} stroke="var(--color-water)" />
            <span className="text-[15px] font-bold">
              {freezes !== null ? t('barrelTitle', { count: freezes }) : t('barrelName')}
            </span>
            <span className="text-[12px] leading-[1.35] text-muted-foreground">
              {freezes !== null ? t('barrelBody') : t('comingSoon')}
            </span>
          </div>
          {group?.href ? (
            <Link href={group.href} className={GROUP_CARD}>
              {groupCard}
            </Link>
          ) : group ? (
            <div className={GROUP_CARD}>{groupCard}</div>
          ) : null}
        </div>
      </div>

      <GardenTabBar active="missions" sticky={stickyNav} />
    </div>
  );
}
