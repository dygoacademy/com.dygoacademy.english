import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import {
  SPEAK_FIXTURE_ITEM,
  SPEAK_FIXTURE_RESULT,
  SPEAK_FIXTURE_SESSION,
} from '../screens/speakFixtures';

const mutate = vi.fn();
const prefetch = vi.fn();
const recorderStop = vi.fn();
const release = vi.fn();
const push = vi.fn();
const retryNative = vi.fn();
/** Per-test switches for the mocks below. */
const env = {
  permission: 'granted' as string,
  recorder: 'media-recorder' as string | null,
  micError: null as null | { kind: string },
  result: SPEAK_FIXTURE_RESULT,
  nativeError: false,
};

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/hooks/useSpeakingSession', () => ({
  useSpeakingSession: () => ({
    data: SPEAK_FIXTURE_SESSION,
    isFetchedAfterMount: true,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/useCreateSpeakingAttempt', () => ({
  useCreateSpeakingAttempt: () => ({ mutate }),
}));
vi.mock('@/hooks/useNativeEnvelope', () => ({
  useNativeEnvelope: () =>
    env.nativeError
      ? { clip: null, error: true, retry: retryNative }
      : {
          clip: {
            pcm: { samples: new Float32Array(16000), sampleRate: 16000 },
            envelope: [0.1, 0.5, 0.2],
          },
          error: false,
          retry: retryNative,
        },
}));
vi.mock('@/hooks/useLiveLevels', () => ({
  LIVE_LEVELS_PER_SECOND: 20,
  useLiveLevels: () => [0.1, 0.2],
}));
vi.mock('@/lib/media-cache', () => ({ prefetchMedia: (...a: unknown[]) => prefetch(...a) }));
vi.mock('@/lib/speaking/envelopeScorer', () => ({
  envelopeScorer: { score: () => Promise.resolve(env.result) },
}));
vi.mock('@/lib/speaking/audio', async (orig) => ({
  ...(await orig<typeof import('@/lib/speaking/audio')>()),
  speakingSupport: () => ({ mic: true, recorder: env.recorder }),
  micPermission: () => Promise.resolve(env.permission),
  resumeAudioContext: () => Promise.resolve({}),
  getAudioContext: () => ({}),
  requestMic: () =>
    env.micError ? Promise.reject(env.micError) : Promise.resolve({ getTracks: () => [] }),
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

import { SpeakFlow, SpeakLive } from './SpeakLive';

/** Renders and lets the mic-permission check settle. */
async function renderLive() {
  renderWithIntl(<SpeakLive />);
  await act(async () => {});
}

describe('SpeakLive (The Pond)', () => {
  beforeEach(() => {
    Object.assign(env, {
      permission: 'granted',
      recorder: 'media-recorder',
      micError: null,
      result: SPEAK_FIXTURE_RESULT,
      nativeError: false,
    });
    window.localStorage.clear();
    push.mockReset();
    mutate.mockReset();
    prefetch.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:me');
    URL.revokeObjectURL = vi.fn();
  });

  it('runs listen → record → compare (scored, attempt saved) → … → done', async () => {
    await renderLive();
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
    await renderLive();
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
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Start speaking' })).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  const record = async () => {
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
  };

  it('too quiet: nothing heard → SP1 says so, nothing saved, mic still there', async () => {
    env.result = {
      ...SPEAK_FIXTURE_RESULT,
      userDurationMs: 0,
      wordMarks: SPEAK_FIXTURE_RESULT.wordMarks.map((m) => ({
        ...m,
        ok: false,
        reason: 'missing' as const,
      })),
    };
    await renderLive();
    await record();
    await waitFor(() => expect(screen.getByText("We couldn't hear you")).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Start speaking' })).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('too short: under 0.8 s of voice → "Say the whole sentence"', async () => {
    env.result = { ...SPEAK_FIXTURE_RESULT, userDurationMs: 500 };
    await renderLive();
    await record();
    await waitFor(() => expect(screen.getByText('Say the whole sentence')).toBeTruthy());
    expect(mutate).not.toHaveBeenCalled();
  });

  it('first time: the mic explainer, then Allow starts recording', async () => {
    env.permission = 'prompt';
    await renderLive();
    fireEvent.click(screen.getByRole('button', { name: 'Start speaking' }));
    expect(screen.getByRole('dialog', { name: 'Dygo needs your microphone' })).toBeTruthy();
    expect(screen.getByText(/We don't save your recordings/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start speaking' })).toBeNull();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Allow microphone' })),
    );
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
    expect(window.localStorage.getItem('dygo:speak-mic-explained')).toBe('1');
  });

  it('Not now closes the explainer', async () => {
    env.permission = 'prompt';
    await renderLive();
    fireEvent.click(screen.getByRole('button', { name: 'Start speaking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Start speaking' })).toBeTruthy();
  });

  it('denied: how to turn it on, Try again, Skip speaking → Missions', async () => {
    env.micError = { kind: 'denied' };
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
    expect(screen.getByText('The microphone is off for Dygo')).toBeTruthy();
    expect(screen.getByText(/Website Settings/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start speaking' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Skip speaking' }));
    expect(push).toHaveBeenCalledWith('/missions');
  });

  it('no support: no mic, says so', () => {
    env.recorder = null;
    renderWithIntl(<SpeakLive />);
    expect(screen.getByText("Speaking isn't available on this browser")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start speaking' })).toBeNull();
  });

  it('audio failed: Retry reloads the clip, Next word skips the sentence', () => {
    env.nativeError = true;
    renderWithIntl(<SpeakLive />);
    expect(screen.getByText("Couldn't load the native audio")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retryNative).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next word' }));
    expect(screen.getByText('2/5')).toBeTruthy();
  });

  it('dev toggle: forceNotice opens SP1 on that state', () => {
    renderWithIntl(<SpeakLive forceNotice="short" />);
    expect(screen.getByText('Say the whole sentence')).toBeTruthy();
  });

  it('single mode ("Say this one?"): one sentence, Back to the card closes, no SP4', async () => {
    const onClose = vi.fn();
    renderWithIntl(
      <SpeakFlow
        items={[SPEAK_FIXTURE_ITEM]}
        defaultAccent="UK"
        closeHref="/review"
        onClose={onClose}
        mode="single"
        onSkipSpeaking={vi.fn()}
      />,
    );
    await act(async () => {});
    expect(screen.getByText('1/1')).toBeTruthy();
    await record();
    await waitFor(() => expect(screen.getByText('In bloom · 82% match')).toBeTruthy());
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ accent: 'UK' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to the card' }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText(/out loud/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
