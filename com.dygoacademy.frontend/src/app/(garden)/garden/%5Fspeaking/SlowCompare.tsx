'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/garden';
import { prepareSlowClip, usePlayer } from '@/hooks/usePlayer';
import { apiClient } from '@/lib/api-client';
import { PRON_SLOW_RATE } from '@/lib/speaking/pronounce';
import type { GuestWordCard, SpeakingAccent } from '@/types';

/**
 * "Slowly" check: a word's clip at 1× and slowed to PRON_SLOW_RATE in the
 * browser (pitch kept), exactly as Pronunciation's Slowly plays it. Was an
 * A/B against the TTS slow clip (audio_slow_url_*) until Dylan chose the
 * browser slowdown and the slow clips were dropped (2026-10-25). Each
 * button plays only the chosen accent's clip. Dev tool: English labels
 * (see page.tsx).
 */
export const SLOW_COPY = {
  title: '4 · Slowly',
  help: 'Slowly = the normal clip slowed here (pitch kept), as Pronunciation plays it.',
  word: 'Word',
  accent: 'Accent',
  lookUp: 'Look up',
  notFound: 'Not in the lexicon.',
  normal: 'Normal 1×',
  slow: `Slowly ${PRON_SLOW_RATE}×`,
  none: (label: string) => `${label} (none)`,
} as const;

type Clip = { src: string | null; rate: number };

/** The accent's clip at 1× and at PRON_SLOW_RATE. */
export function slowCompareClips(
  word: GuestWordCard,
  accent: SpeakingAccent,
): { normal: Clip; slow: Clip } {
  const normal = (accent === 'UK' ? word.audio_url_uk : word.audio_url_us) ?? null;
  return { normal: { src: normal, rate: 1 }, slow: { src: normal, rate: PRON_SLOW_RATE } };
}

export function SlowCompare() {
  const player = usePlayer();
  const [text, setText] = useState('inevitable');
  const [accent, setAccent] = useState<SpeakingAccent>('US');
  const [word, setWord] = useState<GuestWordCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookUp = async () => {
    setError(null);
    setWord(null);
    try {
      setWord(
        await apiClient.get<GuestWordCard>(
          `/words/guest-lookup?word=${encodeURIComponent(text.trim())}`,
        ),
      );
    } catch {
      setError(SLOW_COPY.notFound);
    }
  };

  const clips = word ? slowCompareClips(word, accent) : null;
  // Slowly plays a copy slowed in the browser: make it before the tap, as Pronunciation does.
  const slowSrc = clips?.slow.src;
  useEffect(() => {
    if (slowSrc) prepareSlowClip(slowSrc, PRON_SLOW_RATE);
  }, [slowSrc]);

  const button = (label: string, clip: Clip) => (
    <Button
      variant="secondary"
      disabled={!clip.src}
      onClick={() => clip.src && void player.play(clip.src, clip.rate).catch(() => undefined)}
    >
      {clip.src ? label : SLOW_COPY.none(label)}
    </Button>
  );

  return (
    <div>
      <p className="text-body-s text-muted-foreground">{SLOW_COPY.help}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          aria-label={SLOW_COPY.word}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void lookUp()}
          className="h-11 min-w-0 flex-1 rounded-input border border-border bg-surface px-3"
        />
        <Button variant="forest" onClick={() => void lookUp()}>
          {SLOW_COPY.lookUp}
        </Button>
      </div>
      <div className="mt-3 flex gap-2" role="group" aria-label={SLOW_COPY.accent}>
        {(['US', 'UK'] as const).map((a) => (
          <Button
            key={a}
            variant={a === accent ? 'forest' : 'secondary'}
            aria-pressed={a === accent}
            onClick={() => setAccent(a)}
          >
            {a}
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-body-s">{error}</p>}
      {word && clips && (
        <div className="mt-3">
          <p className="font-medium">
            {word.source_word}{' '}
            <span className="text-muted-foreground">
              {(accent === 'UK' ? word.ipa_uk : word.ipa_us) ?? ''}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {button(SLOW_COPY.normal, clips.normal)}
            {button(SLOW_COPY.slow, clips.slow)}
          </div>
        </div>
      )}
    </div>
  );
}
