'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';

import {
  BottomSheet,
  Button,
  Chip,
  PlantGlyph,
  ProgressVine,
  RatingBar,
  ReviewCard,
  StageTile,
  Switch,
  Toast,
  type PlantStage,
  type Rating,
} from '@/components/garden';

import { TEST_TONE } from './galleryAudio';

/** The stateful parts of the gallery (chips, switches, vine, bloom, rating bar, …). */
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

export function GalleryBloom() {
  const t = useTranslations('gallery.sample');
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div key={run} className="flex items-end gap-4">
        <PlantGlyph stage="flower" size={72} animate="bloom" />
        <PlantGlyph stage="tree" size={72} animate="bloom" />
      </div>
      <Button variant="secondary" className="w-auto" onClick={() => setRun((n) => n + 1)}>
        {t('replayBloom')}
      </Button>
    </div>
  );
}

export function GalleryRatingBar() {
  const t = useTranslations('gallery');
  const [last, setLast] = useState<Rating | null>(null);
  const [saving, setSaving] = useState(false);
  const intervals = {
    again: { unit: 'minutes', count: 1 },
    hard: { unit: 'minutes', count: 8 },
    good: { unit: 'days', count: 3 },
    easy: { unit: 'days', count: 8 },
  } as const;
  const ratingNames = useTranslations('components.rating');
  return (
    <div>
      <p className="overline-label mb-2 mt-5 text-label text-garden-muted">
        {t('states.interactive')}
      </p>
      <RatingBar
        intervals={intervals}
        disabled={saving}
        onRate={(rating) => {
          setLast(rating);
          setSaving(true);
          window.setTimeout(() => setSaving(false), 800);
        }}
      />
      <p className="mt-2 text-body-s text-garden-muted" aria-live="polite">
        {last ? t('states.lastRating', { rating: ratingNames(last) }) : t('states.noRating')}
      </p>
      <p className="overline-label mb-2 mt-5 text-label text-garden-muted">{t('states.saving')}</p>
      <RatingBar intervals={intervals} disabled keyboardShortcuts={false} onRate={() => {}} />
    </div>
  );
}

export function GalleryReviewToggle() {
  const t = useTranslations('gallery.sample');
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="space-y-4">
      <ReviewCard
        word={t('reviewWord')}
        ipa={t('reviewIpa')}
        audioSrc={TEST_TONE}
        level={t('reviewLevel')}
        topic={t('reviewTopic')}
        partOfSpeech={t('reviewPos')}
        revealed={revealed}
        meaning={t('reviewMeaning')}
        meaningTranslation={{ text: t('reviewTranslation'), lang: 'vi' }}
        example={t('reviewExample')}
        collocations={[t('reviewCollocation1'), t('reviewCollocation2')]}
      />
      <Button variant="forest" onClick={() => setRevealed((value) => !value)}>
        {revealed ? t('hideAnswer') : t('showAnswer')}
      </Button>
    </div>
  );
}

export function GalleryStageTiles() {
  const t = useTranslations('gallery.sample');
  const format = useFormatter();
  const [selected, setSelected] = useState<PlantStage | null>('flower');
  const tiles: Array<{ stage: PlantStage; count: number; label: string }> = [
    { stage: 'seed', count: 24, label: t('stageSeeds') },
    { stage: 'sprout', count: 37, label: t('stageSprouts') },
    { stage: 'flower', count: 112, label: t('stageFlowers') },
    { stage: 'tree', count: 1204, label: t('stageRipe') },
    { stage: 'wilting', count: 3, label: t('stageWilting') },
    { stage: 'thirsty', count: 18, label: t('stageThirsty') },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 medium:grid-cols-6">
      {tiles.map((tile) => (
        <StageTile
          key={tile.stage}
          stage={tile.stage}
          count={format.number(tile.count)}
          label={tile.label}
          selected={selected === tile.stage}
          onClick={() => setSelected((current) => (current === tile.stage ? null : tile.stage))}
        />
      ))}
    </div>
  );
}

export function GallerySheets() {
  const t = useTranslations('gallery.sample');
  const [open, setOpen] = useState(false);
  const [longOpen, setLongOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t('openSheet')}
      </Button>
      <Button variant="secondary" onClick={() => setLongOpen(true)}>
        {t('openLongSheet')}
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={t('sheetTitle')}
        description={t('sheetDescription')}
        footer={<Button onClick={() => setOpen(false)}>{t('sheetAction')}</Button>}
      >
        <p className="text-body-m">{t('sheetBody')}</p>
      </BottomSheet>
      <BottomSheet open={longOpen} onOpenChange={setLongOpen} title={t('sheetTitle')}>
        <div className="space-y-3">
          {Array.from({ length: 30 }, (_, index) => (
            <p key={index} className="text-body-m">
              {t('sheetLongLine', { n: index + 1 })}
            </p>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

export function GalleryToasts() {
  const t = useTranslations('gallery.sample');
  const [toast, setToast] = useState<{ variant: 'info' | 'success'; message: string } | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="secondary"
        onClick={() => setToast({ variant: 'info', message: t('toastInfo') })}
      >
        {t('showInfoToast')}
      </Button>
      <Button
        variant="secondary"
        onClick={() => setToast({ variant: 'success', message: t('toastSuccess') })}
      >
        {t('showSuccessToast')}
      </Button>
      <Toast
        open={toast !== null}
        onOpenChange={(open) => {
          if (!open) setToast(null);
        }}
        message={toast?.message ?? ''}
        variant={toast?.variant}
      />
    </div>
  );
}

/** A toast pinned open in the page flow, to compare with the mockup. */
export function GalleryStaticToast({ variant }: { variant: 'info' | 'success' }) {
  const t = useTranslations('gallery.sample');
  return (
    <Toast
      position="inline"
      open
      duration={0}
      variant={variant}
      onOpenChange={() => {}}
      message={variant === 'success' ? t('toastSuccess') : t('toastInfo')}
    />
  );
}
