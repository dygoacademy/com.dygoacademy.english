'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useSpeakingWord } from '@/hooks/useSpeakOffers';

import { SpeakFlow } from './SpeakLive';
import { Button } from '../Button';
import { LiveLoading } from './LiveState';

/**
 * "Say this one?" (T9-a): SP1 → SP2 → SP3 for one review card's sentence,
 * over the card. Close or "Back to the card" returns to the same card; it
 * never changes the card's SRS grade (D5). The attempt is saved like The
 * Pond's.
 */
export function SayThisSheet({
  topicWordId,
  onClose,
  onSkipSpeaking,
}: {
  topicWordId: string;
  onClose: () => void;
  /** "Skip speaking" on the denied card: also hides the session's other offers. */
  onSkipSpeaking: () => void;
}) {
  const t = useTranslations('screens.speak');
  const word = useSpeakingWord(topicWordId);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('sayThis.offer')}
      className="fixed inset-0 z-50 overflow-y-auto bg-bg"
    >
      {word.data ? (
        <SpeakFlow
          items={[word.data.item]}
          defaultAccent={word.data.default_accent}
          closeHref={GARDEN_ROUTES.review}
          onClose={onClose}
          mode="single"
          onSkipSpeaking={onSkipSpeaking}
        />
      ) : word.isError ? (
        <div
          role="alert"
          className="flex min-h-screen-dvh flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <p className="text-[15px] text-muted-foreground">{t('audioFailed.title')}</p>
          <Button variant="forest" className="w-full max-w-[320px]" onClick={onClose}>
            {t('sayThis.close')}
          </Button>
        </div>
      ) : (
        <LiveLoading />
      )}
    </div>
  );
}
