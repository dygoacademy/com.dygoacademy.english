import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import {
  SPEAK_FIXTURE_ITEM,
  SPEAK_FIXTURE_RESULT,
  SPEAK_FIXTURE_SESSION,
} from '../screens/speakFixtures';

const mutate = vi.fn();
const prefetch = vi.fn();
const recorderStop = vi.fn();
const recorderStart = vi.fn();
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
  /** The check rejects (SP3 → "Couldn't check this one"). */
  checkFails: false,
  levels: [0.1, 0.2] as number[],
  /** The session has no sentences (none of the learner's words is voiced yet). */
  emptySession: false,
};

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { email: 'minh@example.com', user_metadata: {} } }),
}));
vi.mock('@/hooks/useSrsStats', () => ({ useSrsStats: () => ({ data: undefined }) }));
vi.mock('@/hooks/useVoiceDonation', () => ({ useVoiceDonation: () => ({ data: undefined }) }));
vi.mock('@/hooks/useSpeakingSession', () => ({
  useSpeakingSession: () => ({
    data: env.emptySession ? { ...SPEAK_FIXTURE_SESSION, item_count: 0, items: [] } : SPEAK_FIXTURE_SESSION,
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
  useLiveLevels: (_s: unknown, active: boolean) => (active ? env.levels : []),
}));
vi.mock('@/lib/media-cache', () => ({ prefetchMedia: (...a: unknown[]) => prefetch(...a) }));
// S18: the server check posts through the API client (which reads env on load).
const upload = vi.fn();
const apiGet = vi.fn();
vi.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    apiClient: {
      upload: (...a: unknown[]) => upload(...a),
      get: (...a: unknown[]) => apiGet(...a),
    },
  };
});
vi.mock('@/lib/speaking/envelopeScorer', async (orig) => ({
  ...(await orig<typeof import('@/lib/speaking/envelopeScorer')>()),
  envelopeScorer: {
    score: () => (env.checkFails ? Promise.reject(new Error('down')) : Promise.resolve(env.result)),
  },
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
    start: recorderStart,
    cancel: vi.fn(),
    stop: () => {
      recorderStop();
      return Promise.resolve({ blob: new Blob(['x']), mimeType: 'audio/mp4', durationMs: 3000 });
    },
  }),
}));

import { SpeakFlow, SpeakLive } from './SpeakLive';

/** The 3 · 2 · 1 (0.9 s a step), the beep, then 150 ms until recording (handover v2 §3.2). */
async function countdown() {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
  }
  await act(async () => {
    vi.advanceTimersByTime(150);
  });
}

/** Renders and lets the mic-permission check settle. */
/** Start, count down, stop. */
async function record() {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
  await countdown();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
}

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
      checkFails: false,
      levels: [0.1, 0.2],
      emptySession: false,
    });
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] });
    recorderStart.mockReset();
    recorderStop.mockReset();
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
        fireEvent.click(screen.getByRole('button', { name: 'Start recording' })),
      );
      await countdown();
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
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    await countdown();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    await waitFor(() => expect(screen.getByText('In bloom · 82% match')).toBeTruthy());
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
    await countdown();
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
    expect(screen.getByText('1/5')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    upload.mockReset();
    apiGet.mockReset();
  });

  const COUNT_BUTTON = 'Get ready. Recording starts after the beep. Tap to start now';

  it('counts down 3 · 2 · 1 (0.9 s a step), beeps, records 150 ms later', async () => {
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    expect(screen.getByRole('button', { name: COUNT_BUTTON }).textContent).toContain('3');
    expect(screen.getByText('Starting soon')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Stop recording' })).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByRole('button', { name: COUNT_BUTTON }).textContent).toContain('2');
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        vi.advanceTimersByTime(900);
      });
    }
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
    expect(recorderStart).not.toHaveBeenCalled(); // the beep isn't recorded
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(recorderStart).toHaveBeenCalledTimes(1);
    expect(screen.getByText('or just pause, it stops by itself')).toBeTruthy();
  });

  it('tapping the countdown skips straight to the beep', async () => {
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: COUNT_BUTTON })));
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(recorderStart).toHaveBeenCalledTimes(1);
  });

  it('checking, then done: Compare opens at once and the result fills in', async () => {
    let finish: (r: typeof SPEAK_FIXTURE_RESULT) => void = () => undefined;
    const pending = new Promise<typeof SPEAK_FIXTURE_RESULT>((res) => (finish = res));
    const { envelopeScorer } = await import('@/lib/speaking/envelopeScorer');
    const spy = vi.spyOn(envelopeScorer, 'score').mockReturnValueOnce(pending);
    await renderLive();
    await record();
    await waitFor(() => expect(screen.getByText('Checking your sentence…')).toBeTruthy());
    expect(screen.getByText('Your recording is checked, then deleted.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play your recording' })).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
    await act(async () => finish(SPEAK_FIXTURE_RESULT));
    await waitFor(() => expect(screen.getByText('In bloom · 82% match')).toBeTruthy());
    expect(mutate).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("failed: Couldn't check this one, then Check again succeeds", async () => {
    env.checkFails = true;
    await renderLive();
    await record();
    await waitFor(() => expect(screen.getByText("Couldn't check this one")).toBeTruthy());
    expect(mutate).not.toHaveBeenCalled();
    env.checkFails = false;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Check again' })));
    await waitFor(() => expect(screen.getByText('In bloom · 82% match')).toBeTruthy());
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('stops by itself 2 s after the voice ends, then checks', async () => {
    const bars = (n: number, v: number) => Array.from({ length: n }, () => v);
    env.levels = [...bars(10, 0.004), ...bars(40, 0.2), ...bars(40, 0.004)];
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    await countdown();
    await waitFor(() => expect(recorderStop).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('In bloom · 82% match')).toBeTruthy());
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('waits 5 s after the beep before "We couldn\'t hear you", on a retry too', async () => {
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'],
    });
    env.levels = Array.from({ length: 20 }, () => 0.004); // room noise, no voice
    await renderLive();
    const quietAfterBeep = async () => {
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Start recording' })),
      );
      await countdown();
      expect(screen.queryByText("We couldn't hear you")).toBeNull();
      await act(async () => {
        vi.advanceTimersByTime(4500);
      });
      expect(screen.queryByText("We couldn't hear you")).toBeNull();
      expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
      await act(async () => {
        vi.advanceTimersByTime(700);
      });
      expect(screen.getByText("We couldn't hear you")).toBeTruthy();
    };
    await quietAfterBeep();
    await quietAfterBeep(); // the first attempt's clock mustn't carry over
    expect(mutate).not.toHaveBeenCalled();
  });

  it('server mode (S18): uploads the recording, shows its marks, saves them without "heard"', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPEECH_CHECK', 'server');
    const words = SPEAK_FIXTURE_ITEM.sentence.split(' ');
    upload.mockResolvedValue({ check_id: 'c1', status: 'queued', position: 0, eta_s: 3 });
    apiGet.mockResolvedValue({
      check_id: 'c1',
      status: 'done',
      result: {
        score: 64,
        stage: 'sprout',
        word_marks: words.map((_, index) =>
          index === 6
            ? { index, ok: false, reason: 'missing' }
            : index === 7
              ? { index, ok: false, reason: 'unclear', heard: 'affects' }
              : { index, ok: true, reason: null },
        ),
        user_duration_ms: 3500,
        check_ms: 1500,
      },
    });
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    await countdown();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const [path, form] = upload.mock.calls[0] as [string, FormData];
    expect(path).toBe('/speaking/check-speech');
    expect(form.get('item_id')).toBe(SPEAK_FIXTURE_ITEM.id);
    const saved = mutate.mock.calls[0][0];
    expect(saved).toMatchObject({ score: 64, stage: 'sprout', user_duration_ms: 3500 });
    expect(saved.word_marks[6]).toEqual({ index: 6, ok: false, reason: 'missing' });
    expect(saved.word_marks[7]).toEqual({ index: 7, ok: false, reason: 'unclear' });
    expect(screen.getByText('heard “affects”')).toBeTruthy();
  });

  it('server mode: a failed upload shows "Couldn\'t check this one" and saves nothing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPEECH_CHECK', 'server');
    upload.mockRejectedValue(new Error('503'));
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    await countdown();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    await waitFor(() => expect(screen.getByText("Couldn't check this one")).toBeTruthy());
    expect(mutate).not.toHaveBeenCalled();
  });

  it("server busy: shows the phone's own result as a quick check and saves its marks", async () => {
    vi.stubEnv('NEXT_PUBLIC_SPEECH_CHECK', 'server');
    const { ApiError } = await import('@/lib/api-client');
    upload.mockRejectedValue(new ApiError('Speech checking is busy', 503));
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    await countdown();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    await waitFor(() => expect(screen.getByTestId('quick-check')).toBeTruthy());
    expect(screen.getByText('Quick check on this phone: the checker was busy.')).toBeTruthy();
    expect(screen.getByText('In bloom · 82% match')).toBeTruthy();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0]).toMatchObject({ score: 82, stage: 'bloom' });
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('cancel during the countdown never starts the recorder', async () => {
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await countdown();
    expect(recorderStart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeTruthy();
  });

  it('cancel goes back to listening', async () => {
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

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
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeTruthy();
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
    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }));
    expect(screen.getByRole('dialog', { name: 'Dygo needs your microphone' })).toBeTruthy();
    expect(screen.getByText(/We don't save your recordings/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start recording' })).toBeNull();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Allow microphone' })),
    );
    await countdown();
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
    expect(window.localStorage.getItem('dygo:speak-mic-explained')).toBe('1');
  });

  it('Not now closes the explainer', async () => {
    env.permission = 'prompt';
    await renderLive();
    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeTruthy();
  });

  it('denied: how to turn it on, Try again, Skip speaking → Missions', async () => {
    env.micError = { kind: 'denied' };
    await renderLive();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start recording' })));
    expect(screen.getByText('The microphone is off for Dygo')).toBeTruthy();
    expect(screen.getByText(/Website Settings/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start recording' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Skip speaking' }));
    expect(push).toHaveBeenCalledWith('/missions');
  });

  it('no sentences yet: says so (not "couldn\'t load"), Back to garden closes', () => {
    env.emptySession = true;
    renderWithIntl(<SpeakLive />);
    expect(screen.getByText(/Your words don’t have sentences to say yet/)).toBeTruthy();
    expect(screen.queryByText(/couldn’t load your garden/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to garden' }));
    expect(push).toHaveBeenCalledWith('/missions');
  });

  it('no support: no mic, says so', () => {
    env.recorder = null;
    renderWithIntl(<SpeakLive />);
    expect(screen.getByText("Speaking isn't available on this browser")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start recording' })).toBeNull();
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
