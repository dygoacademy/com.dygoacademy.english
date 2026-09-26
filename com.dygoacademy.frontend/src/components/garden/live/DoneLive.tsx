'use client';

import * as React from 'react';
import { useFormatter, useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { useSrsStats } from '@/hooks/useSrsStats';

import { MissionCompleteScreen } from '../screens/MissionCompleteScreen';
import type { WeekDay } from '../WeekDots';
import { isoDate, weekOf, type SessionResult } from './data';

/**
 * /garden/review/done: Mission complete (A3) for the session that just
 * ended. The session's results come in the URL from /garden/review
 * (watered, recalled %, minutes, a word that bloomed); the streak from
 * GET /srs/stats and this week's days from GET /srs/activity (a day is
 * done when it has reviews). Missions and the reminder row wait for UI-6.
 */
export function DoneLive({ result }: { result: SessionResult }) {
  const t = useTranslations('screens.live');
  const format = useFormatter();
  const stats = useSrsStats();
  const activity = useDailyActivity(7);

  const today = new Date();
  const todayIso = isoDate(today);
  const active = new Set(
    (activity.data ?? []).filter((d) => d.review_count > 0).map((d) => d.review_date.slice(0, 10)),
  );
  const week: WeekDay[] | null = activity.data
    ? weekOf(today).map((day) => {
        const iso = isoDate(day);
        const done = active.has(iso) || (iso === todayIso && result.watered > 0);
        return {
          initial: format.dateTime(day, { weekday: 'narrow' }),
          label: t('day', { day: format.dateTime(day, { weekday: 'long' }), done: String(done) }),
          state: iso === todayIso && done ? 'today' : done && iso < todayIso ? 'done' : 'empty',
        };
      })
    : null;

  return (
    <MissionCompleteScreen
      closeHref={GARDEN_ROUTES.home}
      backHref={GARDEN_ROUTES.home}
      words={result.watered}
      bloomed={result.word ? { word: result.word, more: result.more } : null}
      stats={{
        recalledPercent: result.recalled,
        minutesToday: result.minutes,
        streak: stats.data?.current_streak_days ?? null,
      }}
      week={week}
      missions={null}
      reminder={null}
    />
  );
}
