'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { MeaningLocale } from '@/i18n/config';

import { Button } from '../Button';
import { gcn } from '../cn';
import { BackIcon } from '../icons';
import { IconButton } from '../IconButton';
import { Switch } from '../Switch';
import { SCREEN_CLASSES } from './GardenTabBar';

/**
 * A8d · Meanings in (canvas `reference/A8d-meanings*`, approved
 * 2026-11-14).
 *
 * English only / Tiếng Việt / 中文 (all selectable, Dylan 2026-11-14), then,
 * with a meaning language picked, "Recall first" (on by default): the
 * review card shows the English definition and keeps the translation
 * hidden until tapped. The preview card is the board's own sample word.
 * "Save" saves both and goes back.
 *
 * Props only (`live/MeaningsLive` saves `meaning_locale` and `recall_first`).
 */
export type MeaningChoice = MeaningLocale | 'none';

const CHOICES: readonly MeaningChoice[] = ['none', 'vi-VN', 'zh-CN'];

/** The board's preview word (sample data, not the learner's). */
const PREVIEW = {
  word: 'mitigate',
  ipa: '/ˈmɪt.ɪ.ɡeɪt/',
  level: 'C1',
  definition: 'to make something bad less harmful or serious',
  translation: {
    'vi-VN': { text: 'giảm nhẹ, làm dịu bớt', lang: 'vi' },
    'zh-CN': { text: '减轻，缓和', lang: 'zh-Hans' },
  },
} as const;

export interface MeaningsScreenProps {
  backHref: string;
  meaning: MeaningChoice;
  recallFirst: boolean;
  onMeaning: (meaning: MeaningChoice) => void;
  onRecallFirst: (on: boolean) => void;
  onSave: () => void;
  saving?: boolean;
  error?: boolean;
  framed?: boolean;
}

export function MeaningsScreen({
  backHref,
  meaning,
  recallFirst,
  onMeaning,
  onRecallFirst,
  onSave,
  saving = false,
  error = false,
  framed = false,
}: MeaningsScreenProps) {
  const t = useTranslations('screens.meanings');
  const translated = meaning !== 'none';

  return (
    <div
      className={gcn(
        SCREEN_CLASSES,
        'relative gap-3 px-5 pb-6 pt-[22px]',
        framed && 'h-[844px] min-h-0 overflow-hidden',
      )}
    >
      <header className="flex items-center gap-3">
        <IconButton asChild aria-label={t('back')}>
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <h1 className="flex-grow font-display text-[24px] font-semibold leading-[1.15]">
          {t('title')}
        </h1>
      </header>
      <p className="m-0 text-[15px] leading-[1.4] text-muted-foreground">{t('intro')}</p>

      <div
        role="radiogroup"
        aria-label={t('title')}
        className="flex flex-col rounded-[20px] border border-border bg-surface px-4"
      >
        {CHOICES.map((choice) => {
          const picked = choice === meaning;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={saving}
              onClick={() => onMeaning(choice)}
              className="flex min-h-16 items-center gap-3 border-t border-divider bg-transparent py-2 text-left text-text"
            >
              <span className="flex flex-grow flex-col gap-0.5">
                <span className="text-[16px] font-bold">{t(`option.${choice}.title`)}</span>
                <span className="text-[13px] text-muted-foreground">{t(`option.${choice}.sub`)}</span>
              </span>
              <span
                aria-hidden="true"
                className={gcn(
                  'box-content h-[22px] w-[22px] shrink-0 rounded-[11px] border-2 border-forest shadow-[inset_0_0_0_3px_#fff]',
                  picked ? 'bg-forest' : 'bg-surface',
                )}
              />
            </button>
          );
        })}
      </div>

      {translated ? (
        <div className="rise flex items-center gap-3 rounded-[18px] border border-border bg-surface px-[14px] py-2.5">
          <span className="flex flex-grow flex-col">
            <span className="text-[15px] font-bold">{t('recall.title')}</span>
            <span className="text-[12px] leading-[1.35] text-muted-foreground">{t('recall.body')}</span>
          </span>
          <Switch
            size="sm"
            checked={recallFirst}
            disabled={saving}
            aria-label={t('recall.title')}
            onCheckedChange={onRecallFirst}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5 rounded-[22px] border border-border bg-surface px-4 py-[14px] shadow-[0_5px_0_var(--color-card-lift)]">
        <span className="flex justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            {t('preview')}
          </span>
          <span className="rounded-lg bg-on-forest-muted px-2 py-0.5 text-[12px] font-bold text-forest">
            {PREVIEW.level}
          </span>
        </span>
        <span lang="en" className="font-display text-[30px] font-semibold leading-[1.1]">
          {PREVIEW.word}
        </span>
        <span className="text-[14px] text-muted-foreground">{PREVIEW.ipa}</span>
        {!translated ? (
          <span lang="en" className="rise text-[16px] font-semibold">
            {PREVIEW.definition}
          </span>
        ) : recallFirst ? (
          <span className="rise flex flex-col gap-1.5">
            <span lang="en" className="text-[15px] font-semibold">
              {PREVIEW.definition}
            </span>
            <span className="self-start rounded-[10px] border border-dashed border-stage-sprout-leaf bg-forest-wash px-2.5 py-1 text-[13px] font-semibold text-forest">
              {t(`hidden.${meaning}`)}
            </span>
          </span>
        ) : (
          <span className="rise flex flex-col gap-0.5">
            <span lang={PREVIEW.translation[meaning].lang} className="text-[16px] font-bold">
              {PREVIEW.translation[meaning].text}
            </span>
            <span lang="en" className="text-[13px] text-muted-foreground">
              {PREVIEW.definition}
            </span>
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <div role="status" aria-live="polite">
          {error ? (
            <p className="m-0 text-center text-[13px] text-primary-text">{t('error')}</p>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={onSave}
          loading={saving}
          className="h-14 w-full max-w-none px-4 text-[16px] md:max-w-none"
        >
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
