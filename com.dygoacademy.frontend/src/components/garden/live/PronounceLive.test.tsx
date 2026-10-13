import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';
import type { SpeakingWordCheckResult } from '@/types';

import { SPEAK_FIXTURE_ITEM } from '../screens/speakFixtures';

const push = vi.fn();
const recorderStart = vi.fn();
const upload = vi.fn();
const apiGet = vi.fn();
/** The live mic bars the screen sees (room first, then the take). */
const env = { levels: [] as number[] };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/sounds/word',
}));
vi.mock('@/hooks/useTopic', () => ({ useTopic: () => ({ data: undefined }) }));
vi.mock('@/hooks/useLiveLevels', () => ({
  LIVE_LEVELS_PER_SECOND: 20,
  useLiveLevels: (_s: unknown, active: boolean) => (active ? env.levels : []),
}));
vi.mock('@/lib/api-client', () => ({
  ApiError: class extends Error {},
  apiClient: {
    upload: (...a: unknown[]) => upload(...a),
    get: (...a: unknown[]) => apiGet(...a),
  },
}));
vi.mock('@/lib/speaking/audio', async (orig) => ({
  ...(await orig<typeof import('@/lib/speaking/audio')>()),
  speakingSupport: () => ({ mic: true, recorder: 'media-recorder' }),
  resumeAudioContext: () => Promise.resolve({}),
  getAudioContext: () => null,
  requestMic: () => Promise.resolve({ getTracks: () => [] }),
  releaseStream: vi.fn(),
  createRecorder: () => ({
    kind: 'media-recorder',
    start: recorderStart,
    cancel: vi.fn(),
    stop: () =>
      Promise.resolve({ blob: new Blob(['x'], { type: 'audio/webm' }), mimeType: 'audio/webm', durationMs: 900 }),
  }),
}));

import { PronounceLive } from './PronounceLive';

const ITEM = {
  ...SPEAK_FIXTURE_ITEM,
  syllables: [
    { text: 'mi', stressed: true },
    { text: 'ti', stressed: false },
    { text: 'gate', stressed: false },
  ],
};
const NEXT = { ...SPEAK_FIXTURE_ITEM, topic_word_id: 'tw2', word: 'deforestation', syllables: [] };

const check = (over: Partial<SpeakingWordCheckResult>): SpeakingWordCheckResult => ({
  kind: 'word',
  status: 'ok',
  passed: true,
  pollinated: true,
  total: 88,
  heard_text: 'mitigate',
  syllables: [
    { ipa: 'mɪt', score: 90, wobbly: false, heard_ipa: null },
    { ipa: 'ɪ', score: 85, wobbly: false, heard_ipa: null },
    { ipa: 'ɡeɪt', score: 90, wobbly: false, heard_ipa: null },
  ],
  spelling: [],
  user_duration_ms: 900,
  check_ms: 300,
  ...over,
});

const bars = (n: number, level: number) => Array.from({ length: n }, () => level);
const ROOM = bars(6, 0.001);

function setCheck(result: SpeakingWordCheckResult) {
  upload.mockResolvedValue({ check_id: 'c1', status: 'queued', position: 0, eta_s: 1 });
  apiGet.mockImplementation((path: string) =>
    Promise.resolve(
      path.startsWith('/speaking/words/tw2')
        ? { default_accent: 'UK', item: NEXT }
        : path.startsWith('/speaking/words/')
          ? { default_accent: 'UK', item: ITEM }
          : { check_id: 'c1', status: 'done', result },
    ),
  );
}

async function renderLive(wordIds = ['tw1']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  renderWithIntl(
    <QueryClientProvider client={client}>
      <PronounceLive wordIds={wordIds} topicId="t1" closeHref="/topics/t1" />
    </QueryClientProvider>,
  );
  await screen.findByRole('button', { name: 'Start speaking' });
}

async function wait(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

/** Real time (setInterval isn't faked), so the recording clock re-renders with the new bars. */
async function tick(ms: number) {
  await act(
    () =>
      new Promise<void>((resolve) => {
        const id = setInterval(() => {
          clearInterval(id);
          resolve();
        }, ms);
      }),
  );
}

/** Tap the mic: the room is heard, then the beep, then recording. */
async function startTake() {
  env.levels = ROOM;
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
  await wait(300 + 150);
  expect(recorderStart).toHaveBeenCalled();
}

/** The learner speaks for `voice` bars, then is quiet 1 s: it stops by itself. */
async function speak(voice: number) {
  env.levels = [...ROOM, ...bars(voice, 0.1), ...bars(22, 0.001)];
  await tick(150);
}

describe('PronounceLive (Stepping stones)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] });
    upload.mockReset();
    apiGet.mockReset();
    recorderStart.mockReset();
    push.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:me');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows one stone per syllable, the stressed one big', async () => {
    setCheck(check({}));
    await renderLive();
    expect(screen.getByText('Bee 1 of 1')).toBeTruthy();
    const pond = screen.getAllByRole('img', { name: /Stepping stones for the syllables MI, ti, gate/ });
    expect(pond.length).toBeGreaterThan(0);
    expect(screen.getAllByText('MI').length).toBeGreaterThan(0);
  });

  it('records, stops by itself after the voice, checks and pollinates (last word: back to the bed)', async () => {
    setCheck(check({}));
    await renderLive();
    await startTake();
    expect(screen.getByText('Recording')).toBeTruthy();
    await speak(10);
    await wait(900);
    expect(upload).toHaveBeenCalledWith('/speaking/check-pronunciation', expect.any(FormData));
    expect(screen.getByText('Clean crossing!')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to the bed' }).getAttribute('href')).toBe('/topics/t1');
  });

  it("says it couldn't hear a quiet take, without calling the server", async () => {
    setCheck(check({}));
    await renderLive();
    await startTake();
    env.levels = [...ROOM, ...bars(20, 0.001)];
    await tick(150);
    await act(async () =>
      fireEvent.click(screen.getAllByRole('button', { name: 'Stop recording' })[0]),
    );
    expect(screen.getByText("We couldn't hear you")).toBeTruthy();
    expect(upload).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Hear the word first' })));
    expect(screen.getByRole('button', { name: 'Start speaking' })).toBeTruthy();
  });

  it('shows another word as P2b, and Try again records straight away', async () => {
    setCheck(check({ status: 'other_word', passed: false, pollinated: false, heard_text: 'medicate' }));
    await renderLive();
    await startTake();
    await speak(10);
    await wait(900);
    expect(screen.getByText('That sounded like another word')).toBeTruthy();
    expect(screen.getByText('We heard “medicate”. Say just “mitigate”.')).toBeTruthy();
    recorderStart.mockReset();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
    await wait(450);
    expect(recorderStart).toHaveBeenCalled();
    expect(screen.getByText('Recording')).toBeTruthy();
  });

  it('shows the wobbly stone on a miss, and Next bee goes to the next word', async () => {
    setCheck(
      check({
        passed: false,
        pollinated: false,
        total: 62,
        syllables: [
          { ipa: 'mɪt', score: 90, wobbly: false, heard_ipa: null },
          { ipa: 'tɪ', score: 30, wobbly: true, heard_ipa: 'taɪ' },
          { ipa: 'ɡeɪt', score: 90, wobbly: false, heard_ipa: null },
        ],
      }),
    );
    await renderLive(['tw1', 'tw2']);
    await startTake();
    await speak(10);
    await wait(900);
    expect(screen.getByText('One wobbly stone')).toBeTruthy();
    expect(screen.getByText('Almost · 2 of 3 stones')).toBeTruthy();
    expect(screen.getByText('sounded like /taɪ/')).toBeTruthy();
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    await act(async () => fireEvent.click(screen.getAllByRole('button', { name: 'Hear “ti”' })[0]));
    const el = play.mock.instances[0] as unknown as HTMLMediaElement;
    expect(el.playbackRate).toBe(0.7);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Next bee' })));
    expect(await screen.findByText('Bee 2 of 2')).toBeTruthy();
    expect(screen.getAllByText('deforestation').length).toBeGreaterThan(0);
  });
});
