'use client';

import { useTranslations } from 'next-intl';

import type { SpeakNoticeKind } from '@/lib/speaking/constants';

import { Button } from '../Button';

export type { SpeakNoticeKind };

/** Whether the mic button stays under the notice (you can try again right away). */
export const noticeKeepsMic = (kind: SpeakNoticeKind) => kind === 'quiet' || kind === 'short';

export interface SpeakNoticeProps {
  kind: SpeakNoticeKind;
  /** mic: Allow microphone · denied: Try again · audioFailed: Retry. */
  onPrimary?: () => void;
  /** mic: Not now · denied: Skip speaking · audioFailed: Next word. */
  onSecondary?: () => void;
}

/**
 * Mic explainer, permission denied, too quiet, too short, no support and
 * audio failed, built from the existing card and button styles (the
 * states aren't in the canvas). Copy in `screens.speak.{mic,denied,…}`.
 */
export function SpeakNotice({ kind, onPrimary, onSecondary }: SpeakNoticeProps) {
  const t = useTranslations('screens.speak');
  const tone =
    kind === 'quiet' || kind === 'short'
      ? 'border-gold-border bg-gold-soft text-gold-soft-text'
      : 'border-border bg-surface text-text';

  let title: string;
  let lines: string[];
  let primary: string | null = null;
  let secondary: string | null = null;
  switch (kind) {
    case 'mic':
      title = t('mic.title');
      lines = [t('mic.why'), t('mic.private'), t('mic.headphones')];
      primary = t('mic.allow');
      secondary = t('mic.notNow');
      break;
    case 'denied':
      title = t('denied.title');
      lines = [t('denied.body')];
      primary = t('denied.retry');
      secondary = t('denied.skip');
      break;
    case 'audioFailed':
      title = t('audioFailed.title');
      lines = [t('audioFailed.body')];
      primary = t('audioFailed.retry');
      secondary = t('audioFailed.skip');
      break;
    case 'unsupported':
      title = t('unsupported.title');
      lines = [t('unsupported.body')];
      break;
    case 'quiet':
      title = t('quiet.title');
      lines = [t('quiet.body')];
      break;
    case 'short':
      title = t('short.title');
      lines = [t('short.body')];
      break;
  }

  return (
    <div
      role={kind === 'mic' ? 'dialog' : 'alert'}
      aria-label={kind === 'mic' ? title : undefined}
      data-notice={kind}
      className={`flex w-full flex-col gap-2 rounded-card border px-4 py-3.5 ${tone}`}
    >
      <span className="text-[16px] font-bold">{title}</span>
      {lines.map((line) => (
        <span key={line} className="text-[14px] leading-[1.4]">
          {line}
        </span>
      ))}
      {primary || secondary ? (
        <div className="mt-1 flex flex-col gap-2">
          {primary && onPrimary ? (
            <Button variant={kind === 'mic' ? 'primary' : 'forest'} onClick={onPrimary}>
              {primary}
            </Button>
          ) : null}
          {secondary && onSecondary ? (
            <Button variant="secondary" onClick={onSecondary}>
              {secondary}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
