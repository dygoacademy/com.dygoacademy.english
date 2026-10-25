'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/garden';
import { prepareSlowClip, usePlayer } from '@/hooks/usePlayer';
import { apiClient } from '@/lib/api-client';
import { PRON_SLOW_RATE } from '@/lib/speaking/pronounce';
import type { GuestWordCard, SpeakingAccent } from '@/types';

/**
 * "Slowly" A/B (Dylan, 2026-10-25): is the TTS slow clip
 * (audio_slow_url_*, Google speakingRate 0.7) worth keeping, or is the word
 * clip slowed in the browser (what Pronunciation's Slowly plays without one)
 * good enough? Each button plays only its own accent's clip, no fallback,
 * so the two are compared fairly. Dev tool: English labels (see page.tsx).
 */
export const SLOW_COPY = {
  title: '4 · Slowly A / B',
  help: 'A = the slow clip Google made (speakingRate 0.7). B = the normal clip slowed to 0.7× here (pitch kept), what Slowly plays without a slow clip.',
  word: 'Word',
  accent: 'Accent',
  lookUp: 'Look up',
  notFound: 'Not in the lexicon.',
  normal: 'Normal 1×',
  a: 'A · slow clip',
  b: `B · normal at ${PRON_SLOW_RATE}×`,
  none: (label: string) => `${label} (none)`,
} as const;

type Clip = { src: string | null; rate: number };

/** The three clips for `accent`: normal, A (TTS slow clip) and B (normal clip at PRON_SLOW_RATE). */
export function slowCompareClips(
  word: GuestWordCard,
  accent: SpeakingAccent,
): { normal: Clip; a: Clip; b: Clip } {
  const uk = accent === 'UK';
  const normal = (uk ? word.audio_url_uk : word.audio_url_us) ?? null;
  const slow = (uk ? word.audio_slow_url_uk : word.audio_slow_url_us) ?? null;
  return {
    normal: { src: normal, rate: 1 },
    a: { src: slow, rate: 1 },
    b: { src: normal, rate: PRON_SLOW_RATE },
  };
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
  // B is a slowed copy made in the browser: make it before the tap, as Pronunciation does.
  const bSrc = clips?.b.src;
  useEffect(() => {
    if (bSrc) prepareSlowClip(bSrc, PRON_SLOW_RATE);
  }, [bSrc]);

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
            {button(SLOW_COPY.a, clips.a)}
            {button(SLOW_COPY.b, clips.b)}
          </div>
        </div>
      )}
    </div>
  );
}
