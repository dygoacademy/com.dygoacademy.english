'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';

/**
 * SP0 Microphone (SpeakMic.dc.html, re-exported 2026-10-25): before the
 * first recording, why Dygo needs the mic (ask), or how to turn it back on
 * (denied). Nothing about voice donation here (Dylan, 2026-10-25): every
 * recording is "checked, then deleted" for the learner. Values in
 * docs/design/garden/pronunciation.md.
 */
export interface SpeakMicScreenProps {
  state: 'ask' | 'denied';
  closeHref: string;
  /** ask: Allow microphone (the phone's own prompt comes next). */
  onAllow: () => void;
  /** denied: Open Settings. A web page can't open them, so this asks for the mic again. */
  onOpenSettings: () => void;
  /** denied: Practise listening instead (back to P1). */
  onListen: () => void;
}

const MicIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11 A7 7 0 0 0 19 11" />
    <path d="M12 18 V21" />
  </svg>
);
const Gear = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9" />
  </svg>
);

export function SpeakMicScreen(props: SpeakMicScreenProps) {
  const t = useTranslations('screens.pronounce');
  const m = useTranslations('screens.pronounce.mic');
  const b = (chunks: React.ReactNode) => <b>{chunks}</b>;
  const ask = props.state === 'ask';
  const ROW_ICON = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--pron-pass)] text-forest';
  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg px-5 pb-6 pt-[22px] text-text">
      <div className="flex justify-end">
        <IconButton asChild aria-label={t('close')}>
          <Link href={props.closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
      </div>
      <div className="flex justify-center">
        {ask ? (
          <svg width="190" height="170" viewBox="0 0 190 170" aria-hidden="true">
            <circle className="mic-ripple" cx="95" cy="78" r="58" fill="none" stroke="var(--pond-path)" strokeWidth="3" />
            <circle className="mic-ripple" cx="95" cy="78" r="58" fill="none" stroke="var(--pond-path)" strokeWidth="3" style={{ animationDelay: '1s' }} />
            <circle cx="95" cy="78" r="50" fill="var(--color-forest)" />
            <rect x="82" y="44" width="26" height="46" rx="13" fill="var(--stone-wobbly)" />
            <path d="M72 74 A23 23 0 0 0 118 74" fill="none" stroke="var(--color-bg)" strokeWidth="4" strokeLinecap="round" />
            <path d="M95 97 V122" stroke="var(--pond-ripple)" strokeWidth="4" />
            <path d="M95 112 C84 111 78 104 80 98 C88 98 95 104 95 112 Z" fill="var(--stone-ok)" />
            <path d="M95 106 C106 105 112 98 110 92 C102 92 95 98 95 106 Z" fill="var(--pond-path)" />
            <ellipse cx="95" cy="126" rx="34" ry="6" fill="var(--color-border)" />
          </svg>
        ) : (
          <svg width="190" height="170" viewBox="0 0 190 170" aria-hidden="true">
            <circle cx="95" cy="78" r="50" fill="var(--mic-off)" />
            <rect x="82" y="44" width="26" height="46" rx="13" fill="var(--mic-off-body)" />
            <path d="M72 74 A23 23 0 0 0 118 74" fill="none" stroke="var(--mic-off-line)" strokeWidth="4" strokeLinecap="round" />
            <path d="M62 40 L128 116" stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="95" cy="132" rx="34" ry="6" fill="var(--color-border)" />
          </svg>
        )}
      </div>
      <div className="flex flex-col gap-1.5 text-center">
        <span className="font-display text-[28px] font-semibold leading-[1.15]">
          {ask ? m('askTitle') : m('deniedTitle')}
        </span>
        <span className="text-[15px] leading-[1.45] text-muted-foreground">
          {ask ? m('askBody') : m('deniedBody')}
        </span>
      </div>
      {ask ? (
        <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface px-4 py-3.5">
          {(
            [
              ['rowOn', <MicIcon key="m" size={18} />],
              [
                'rowDeleted',
                <svg key="l" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11 V8 A4 4 0 0 1 16 8 V11" />
                </svg>,
              ],
              ['rowSettings', <Gear key="g" size={18} />],
            ] as const
          ).map(([key, icon]) => (
            <div key={key} className="flex items-center gap-3">
              <span className={ROW_ICON}>{icon}</span>
              <span className="text-[14px] leading-[1.4]">{m(key)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col rounded-[20px] border border-border bg-surface px-3.5 py-1">
          {(['step1', 'step2', 'step3'] as const).map((key, k) => (
            <div key={key} className={`flex items-center gap-3 py-2.5 ${k > 0 ? 'border-t border-[var(--pron-card-line)]' : ''}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-[14px] font-bold text-white">
                {k + 1}
              </span>
              <span className="text-[14px] leading-[1.4]">{m.rich(key, { b })}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-col gap-1.5">
        {ask ? (
          <>
            <span className="text-center text-[13px] text-muted-foreground">{m.rich('hint', { b })}</span>
            <button
              type="button"
              onClick={props.onAllow}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-4 text-[16px] font-bold text-white shadow-[0_4px_0_var(--color-primary-shadow)]"
            >
              <MicIcon />
              {m('allow')}
            </button>
            <Link href={props.closeHref} className="self-center p-2 text-[14px] font-semibold text-muted-foreground underline">
              {m('notNow')}
            </Link>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={props.onOpenSettings}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-forest px-4 text-[16px] font-bold text-white shadow-[0_4px_0_var(--mic-settings-shadow)]"
            >
              <Gear size={20} />
              {m('openSettings')}
            </button>
            <button type="button" onClick={props.onListen} className="self-center p-2 text-[14px] font-semibold text-forest underline">
              {m('listenInstead')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
