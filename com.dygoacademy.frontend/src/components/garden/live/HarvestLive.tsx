'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { WeeklyHarvestScreen } from '../screens/WeeklyHarvestScreen';
import { weekOf } from './data';

/**
 * /garden/missions: Weekly harvest (A4). Everything on this screen is
 * built from daily missions, streak freezes, goals and groups, which
 * arrive with UI-6, so every block shows its "coming soon" state; only
 * the week heading is real.
 */
export function HarvestLive() {
  const t = useTranslations('screens.live');
  const format = useFormatter();
  const monday = weekOf(new Date())[0];
  return (
    <WeeklyHarvestScreen
      weekLabel={t('weekOf', { date: format.dateTime(monday, { day: 'numeric', month: 'long' }) })}
      harvest={null}
      goal={null}
      freezes={null}
      group={null}
    />
  );
}
