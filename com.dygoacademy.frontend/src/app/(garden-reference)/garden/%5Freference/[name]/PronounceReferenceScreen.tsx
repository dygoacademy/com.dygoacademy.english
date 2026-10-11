'use client';

import { PronounceScreen, type PronPhase } from '@/components/garden/pronounce/PronounceScreen';
import {
  PRON_REF,
  PRON_REF_LEVELS_IPAD,
  PRON_REF_LEVELS_PHONE,
  PRON_REF_PASS,
  PRON_REF_RETRY,
  PRON_REF_SYLLABLES,
  pronRefMeaning,
  pronRefTopic,
} from '@/components/garden/screens/pronounceReference';
import { GARDEN_ROUTES } from '@/constants/garden';
import type { AppLocale } from '@/i18n/config';

export type PronounceReferenceName =
  | 'P1-say-word'
  | 'P2-recording-beep'
  | 'P2-recording'
  | 'P3-checking'
  | 'P4-result-retry'
  | 'P4-result-pollinated'
  | 'P2b-not-heard'
  | 'P2b-not-heard-noisy'
  | 'P2b-not-heard-other-word'
  | 'iP1-say-word'
  | 'iP2-recording'
  | 'iP3-checking'
  | 'iP4-result-retry'
  | 'iP4-result-pollinated'
  | 'iP2b-not-heard';

const noop = () => {};

/**
 * The Pronunciation reference pages (canvas page "Adult · Pronunciation"):
 * each board's moment with the canvas sample data. The iP* pages turn the
 * iPad layout on for themselves (`data-garden-ipad`), whatever the flag.
 */
export function PronounceReferenceScreen({
  name,
  locale,
}: {
  name: PronounceReferenceName;
  locale: AppLocale;
}) {
  const ipad = name.startsWith('iP');
  const base = name.replace(/^i/, '');
  const phase: PronPhase = base.startsWith('P1')
    ? 'say'
    : base.startsWith('P2b')
      ? 'notHeard'
      : base.startsWith('P2')
        ? 'recording'
        : base.startsWith('P3')
          ? 'checking'
          : 'result';
  const screen = (
    <PronounceScreen
      phase={phase}
      word={PRON_REF.word}
      ipa={PRON_REF.ipa}
      meaning={pronRefMeaning(locale, ipad)}
      syllables={PRON_REF_SYLLABLES}
      index={PRON_REF.index}
      total={PRON_REF.total}
      topic={pronRefTopic(locale)}
      closeHref={GARDEN_ROUTES.reference('A7-topic-bed')}
      onHearIt={noop}
      onSlowly={noop}
      onMic={noop}
      lit={name === 'P2-recording-beep' ? 0 : ipad ? 2 : 1}
      levels={name === 'P2-recording-beep' ? [] : ipad ? PRON_REF_LEVELS_IPAD : PRON_REF_LEVELS_PHONE}
      elapsedMs={0}
      onStop={noop}
      onCancel={noop}
      onHearMine={noop}
      onHearNative={noop}
      result={base === 'P4-result-pollinated' ? PRON_REF_PASS : PRON_REF_RETRY}
      onHearSyllable={noop}
      onTryAgain={noop}
      nextWord={PRON_REF.nextWord}
      onNext={noop}
      reason={base.endsWith('noisy') ? 'noisy' : base.endsWith('other-word') ? 'other' : 'quiet'}
      heard={PRON_REF.heard}
      onHearFirst={noop}
    />
  );
  return ipad ? <div data-garden-ipad="">{screen}</div> : screen;
}
