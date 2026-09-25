'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Chip, ProgressVine, Switch } from '@/components/garden';

/** The stateful parts of the gallery: chips, switches and the vine. */
export function GalleryChips() {
  const t = useTranslations('gallery.sample');
  const [filter, setFilter] = useState<'all' | 'due' | 'wilting'>('all');
  return (
    <div className="flex flex-wrap gap-2">
      <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
        {t('chipAll')}
      </Chip>
      <Chip selected={filter === 'due'} onClick={() => setFilter('due')}>
        {t('chipDue')}
      </Chip>
      <Chip selected={filter === 'wilting'} onClick={() => setFilter('wilting')}>
        {t('chipWilting')}
      </Chip>
      <Chip disabled>{t('chipAll')}</Chip>
    </div>
  );
}

export function GallerySwitches() {
  const t = useTranslations('gallery.sample');
  const [reminders, setReminders] = useState(true);
  const [sound, setSound] = useState(false);
  return (
    <ul className="divide-y divide-garden-border rounded-card border border-garden-border bg-garden-surface">
      <li className="flex min-h-[60px] items-center justify-between gap-3 px-4">
        <span id="gallery-reminders" className="text-body-m">
          {t('reminders')}
        </span>
        <Switch
          aria-labelledby="gallery-reminders"
          checked={reminders}
          onCheckedChange={setReminders}
        />
      </li>
      <li className="flex min-h-[60px] items-center justify-between gap-3 px-4">
        <span id="gallery-sound" className="text-body-m">
          {t('sound')}
        </span>
        <Switch aria-labelledby="gallery-sound" checked={sound} onCheckedChange={setSound} />
      </li>
      <li className="flex min-h-[60px] items-center justify-between gap-3 px-4">
        <span id="gallery-disabled" className="text-body-m text-garden-muted">
          {t('sound')}
        </span>
        <Switch aria-labelledby="gallery-disabled" checked disabled />
      </li>
    </ul>
  );
}

export function GalleryVine() {
  const t = useTranslations('gallery.sample');
  const total = 18;
  const [done, setDone] = useState(15);
  return (
    <div className="space-y-4">
      {[0, 7, done, total].map((value, index) => (
        <div key={index} className="space-y-1">
          <ProgressVine
            value={value}
            max={total}
            valueText={t('vineText', { done: value, total })}
          />
          <p className="text-body-s text-garden-muted">{t('vineText', { done: value, total })}</p>
        </div>
      ))}
      <input
        type="range"
        min={0}
        max={total}
        value={done}
        onChange={(event) => setDone(Number(event.target.value))}
        aria-label={t('vineText', { done, total })}
        className="w-full accent-garden-success"
      />
    </div>
  );
}
