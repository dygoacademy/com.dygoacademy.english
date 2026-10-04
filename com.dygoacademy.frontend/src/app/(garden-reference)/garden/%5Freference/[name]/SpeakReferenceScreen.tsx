'use client';

import { SpeakCompareScreen } from '@/components/garden/screens/SpeakCompareScreen';
import { SpeakRecordingScreen } from '@/components/garden/screens/SpeakRecordingScreen';
import {
  SPEAK_REF_ELAPSED_MS,
  SPEAK_REF_GHOST,
  SPEAK_REF_ITEM,
  SPEAK_REF_ITEM_SP2,
  SPEAK_REF_LIVE,
  SPEAK_REF_RESULT,
} from '@/components/garden/screens/speakReference';
import { GARDEN_ROUTES } from '@/constants/garden';

export type SpeakReferenceName =
  | 'SP2-speak-countdown'
  | 'SP2-speak-recording'
  | 'SP3-speak-checking'
  | 'SP3-speak-done'
  | 'SP3-speak-failed';

const noop = () => {};

/**
 * The speaking reference pages (canvas page "Adult · Speaking", handover
 * v2): SP2 frozen at "3" and at 0:02, SP3 in each result state, with the
 * canvas's own sample shapes (speakReference.ts). Sentence 2 of 5, UK.
 */
export function SpeakReferenceScreen({ name }: { name: SpeakReferenceName }) {
  const closeHref = GARDEN_ROUTES.reference('A4-weekly-harvest');
  if (name === 'SP2-speak-countdown' || name === 'SP2-speak-recording') {
    const item = SPEAK_REF_ITEM_SP2;
    const counting = name === 'SP2-speak-countdown';
    return (
      <SpeakRecordingScreen
        item={item}
        index={1}
        total={5}
        closeHref={closeHref}
        timings={item.timings_uk}
        ipa={item.ipa_uk}
        nativeLevels={SPEAK_REF_GHOST}
        liveLevels={counting ? [] : SPEAK_REF_LIVE}
        elapsedMs={counting ? 0 : SPEAK_REF_ELAPSED_MS}
        countdown={counting ? 3 : null}
        onSkipCountdown={noop}
        onStop={noop}
        onCancel={noop}
      />
    );
  }
  const status =
    name === 'SP3-speak-done' ? 'done' : name === 'SP3-speak-failed' ? 'failed' : 'checking';
  return (
    <SpeakCompareScreen
      item={SPEAK_REF_ITEM}
      index={1}
      total={5}
      closeHref={closeHref}
      timings={SPEAK_REF_ITEM.timings_uk}
      ipa={SPEAK_REF_ITEM.ipa_uk}
      accent="UK"
      envelopes={SPEAK_REF_RESULT.envelopes}
      userDurationMs={SPEAK_REF_RESULT.userDurationMs}
      status={status}
      result={status === 'done' ? SPEAK_REF_RESULT : null}
      initial="M"
      view="overlay"
      onView={noop}
      playing={null}
      onPlayNative={noop}
      onPlayYou={noop}
      onCheckAgain={noop}
      onRecordAgain={noop}
      onTryAgain={noop}
      onNext={noop}
    />
  );
}
