import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { SPEAK_FIXTURE_RESULT, SPEAK_FIXTURE_SESSION } from '../screens/speakFixtures';

const mutate = vi.fn();
const prefetch = vi.fn();
const recorderStop = vi.fn();
const release = vi.fn();

vi.mock('@/hooks/useSpeakingSession', () => ({
  useSpeakingSession: () => ({ data: SPEAK_FIXTURE_SESSION, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useCreateSpeakingAttempt', () => ({
  useCreateSpeakingAttempt: () => ({ mutate }),
}));
vi.mock('@/hooks/useNativeEnvelope', () => ({
  useNativeEnvelope: () => ({
    clip: {
      pcm: { samples: new Float32Array(16000), sampleRate: 16000 },
      envelope: [0.1, 0.5, 0.2],
    },
    error: false,
    retry: vi.fn(),
  }),
}));
vi.mock('@/hooks/useLiveLevels', () => ({
  LIVE_LEVELS_PER_SECOND: 20,
  useLiveLevels: () => [0.1, 0.2],
}));
vi.mock('@/lib/media-cache', () => ({ prefetchMedia: (...a: unknown[]) => prefetch(...a) }));
vi.mock('@/lib/speaking/envelopeScorer', () => ({
  envelopeScorer: { score: () => Promise.resolve(SPEAK_FIXTURE_RESULT) },
}));
vi.mock('@/lib/speaking/audio', async (orig) => ({
  ...(await orig<typeof import('@/lib/speaking/audio')>()),
  speakingSupport: () => ({ mic: true, recorder: 'media-recorder' }),
  resumeAudioContext: () => Promise.resolve({}),
  getAudioContext: () => ({}),
  requestMic: () => Promise.resolve({ getTracks: () => [] }),
  releaseStream: (...a: unknown[]) => release(...a),
  decodeForScoring: () => Promise.resolve({ samples: new Float32Array(16000), sampleRate: 16000 }),
  createRecorder: () => ({
    kind: 'media-recorder',
    start: vi.fn(),
    cancel: vi.fn(),
    stop: () => {
      recorderStop();
      return Promise.resolve({ blob: new Blob(['x']), mimeType: 'audio/mp4', durationMs: 3000 });
    },
  }),
}));

import { SpeakLive } from './SpeakLive';

describe('SpeakLive (The Pond)', () => {
  beforeEach(() => {
    mutate.mockReset();
    prefetch.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:me');
    URL.revokeObjectURL = vi.fn();
  });

  it('runs listen → record → compare (scored, attempt saved) → … → done', async () => {
    renderWithIntl(<SpeakLive />);
    expect(screen.getByText('1/5')).toBeTruthy();
    expect(prefetch).toHaveBeenCalledWith(
      expect.arrayContaining(['/audio/speaking-fixture/fixture-mitigate-us.m4a']),
    );

    for (let i = 0; i < 5; i++) {
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })),
      );
      expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })),
      );
      await waitFor(() => expect(screen.getByText('In bloom · 82% match')).toBeTruthy());
      fireEvent.click(screen.getByRole('button', { name: 'Next word' }));
    }

    expect(mutate).toHaveBeenCalledTimes(5);
    expect(mutate).toHaveBeenCalledWith({
      item_id: 'fixture-mitigate',
      accent: 'US',
      score: 82,
      stage: 'bloom',
      word_marks: SPEAK_FIXTURE_RESULT.wordMarks,
      user_duration_ms: 3400,
    });
    expect(release).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'You said 5 words out loud' })).toBeTruthy();
    expect(screen.getByText('Pattern to watch:')).toBeTruthy();
  });

  it('try again records the same sentence and saves another attempt', async () => {
    renderWithIntl(<SpeakLive />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    await waitFor(() => expect(screen.getByText('In bloom · 82% match')).toBeTruthy());
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
    expect(screen.getByText('1/5')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
  });

  it('cancel goes back to listening', async () => {
    renderWithIntl(<SpeakLive />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Start speaking' })).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });
});
