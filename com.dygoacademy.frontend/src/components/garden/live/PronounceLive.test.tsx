import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';
import type { SpeakingWordCheckResult } from '@/types';

import { SPEAK_FIXTURE_ITEM } from '../screens/speakFixtures';

const push = vi.fn();
const replace = vi.fn();
const apiPost = vi.fn();
const recorderStart = vi.fn();
const requestMic = vi.fn();
const upload = vi.fn();
const apiGet = vi.fn();
/** The live mic bars the screen sees (room first, then the take). */
const env = { levels: [] as number[] };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
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
    post: (...a: unknown[]) => apiPost(...a),
  },
}));
// Slowly's slowed copy (usePlayer): already made, so a tap plays it straight away.
vi.mock('@/lib/speaking/slow-clip', () => ({
  readySlowClip: (src: string, rate: number) => `blob:slow-${rate}-${src}`,
  makeSlowClip: (src: string, rate: number) => Promise.resolve(`blob:slow-${rate}-${src}`),
}));
vi.mock('@/lib/speaking/audio', async (orig) => ({
  ...(await orig<typeof import('@/lib/speaking/audio')>()),
  speakingSupport: () => ({ mic: true, recorder: 'media-recorder' }),
  resumeAudioContext: () => Promise.resolve({}),
  getAudioContext: () => null,
  requestMic: () => requestMic(),
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
  topic_word_id: 'tw1',
  syllables: [
    { text: 'mi', stressed: true },
    { text: 'ti', stressed: false },
    { text: 'gate', stressed: false },
  ],
};
const NEXT = {
  ...SPEAK_FIXTURE_ITEM,
  topic_word_id: 'tw2',
  word: 'deforestation',
  syllables: [
    { text: 'de', stressed: false },
    { text: 'fo', stressed: false },
    { text: 'res', stressed: false },
    { text: 'ta', stressed: true },
    { text: 'tion', stressed: false },
  ],
};
/** pron_* events sent to POST /events. */
const events = () => apiPost.mock.calls.filter((c) => c[0] === '/events').map((c) => c[1]);

const check = (over: Partial<SpeakingWordCheckResult>): SpeakingWordCheckResult => ({
  kind: 'word',
  status: 'ok',
  passed: true,
  pollinated: true,
  total: 88,
  heard_text: 'mitigate',
  syllables: [
    { ipa: 'mɪt', text: 'mi', score: 90, wobbly: false, heard_ipa: null },
    { ipa: 'tɪ', text: 'ti', score: 85, wobbly: false, heard_ipa: null },
    { ipa: 'ɡeɪt', text: 'gate', score: 90, wobbly: false, heard_ipa: null },
  ],
  spelling: [],
  user_duration_ms: 900,
  check_ms: 300,
  ...over,
});

/** P4 (phone and iPad are one tree). */
const p4 = () => within(document.querySelector('[data-screen="P4"]') as HTMLElement);

const bars = (n: number, level: number) => Array.from({ length: n }, () => level);
const ROOM = bars(6, 0.001);

function setCheck(result: SpeakingWordCheckResult, opts: { nextBlocked?: boolean } = {}) {
  upload.mockResolvedValue({ check_id: 'c1', status: 'queued', position: 0, eta_s: 1 });
  apiPost.mockResolvedValue(undefined);
  apiGet.mockImplementation((path: string) =>
    Promise.resolve(
      path.startsWith('/speaking/words/tw2')
        ? opts.nextBlocked
          ? { default_accent: 'UK', item: { ...NEXT, syllables: [] }, blocked: 'no_syllables' }
          : { default_accent: 'UK', item: NEXT }
        : path.startsWith('/speaking/words/')
          ? { default_accent: 'UK', item: ITEM }
          : { check_id: 'c1', status: 'done', result },
    ),
  );
}

async function renderLive(wordIds = ['tw1']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <PronounceLive wordIds={wordIds} topicId="t1" closeHref="/topics/t1" />
    </QueryClientProvider>,
  );
}

async function renderLiveReady(wordIds = ['tw1']) {
  const r = await renderLive(wordIds);
  await screen.findByRole('button', { name: 'Start speaking' });
  return r;
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

describe('PronounceLive (honeycomb)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] });
    upload.mockReset();
    apiGet.mockReset();
    apiPost.mockReset();
    recorderStart.mockReset();
    requestMic.mockReset();
    requestMic.mockResolvedValue({ getTracks: () => [] });
    push.mockReset();
    replace.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    // SP0 was shown before on this device: the mic goes straight to P2.
    window.localStorage.setItem('dygo:mic-asked', '1');
    URL.createObjectURL = vi.fn(() => 'blob:me');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const NORMAL = 'Play mitigate at normal speed';
  const SLOWLY = 'Play mitigate slowly';
  const NATIVE = 'Play the native speaker saying mitigate';
  const MINE = 'Play your recording of mitigate';

  it('Normal shows loading then playing, turns solid, and a tap while playing stops it', async () => {
    setCheck(check({}));
    await renderLiveReady();
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    let started!: () => void;
    play.mockReturnValueOnce(new Promise<void>((res) => (started = res)));
    const normal = screen.getByRole('button', { name: NORMAL });
    await act(async () => fireEvent.click(normal));
    expect(normal.getAttribute('aria-busy')).toBe('true');
    expect(normal.textContent).toContain('Loading…');
    await act(async () => started());
    expect(normal.getAttribute('aria-busy')).toBeNull();
    expect(normal.getAttribute('aria-pressed')).toBe('true');
    expect(normal.textContent).toContain('Playing, tap to stop');
    expect(screen.getByRole('button', { name: SLOWLY }).getAttribute('aria-pressed')).toBe('false');
    await act(async () => fireEvent.click(normal));
    expect(normal.getAttribute('aria-pressed')).toBe('false');
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('Slowly plays the slowed copy at 1×, one sound at a time, and a failed play says so until the next tap', async () => {
    setCheck(check({}));
    await renderLiveReady();
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    play.mockRejectedValueOnce(new Error('NotSupportedError'));
    const slowly = screen.getByRole('button', { name: SLOWLY });
    await act(async () => fireEvent.click(slowly));
    expect(screen.getByText("Couldn't play the sound. Tap to try again.")).toBeTruthy();
    await act(async () => fireEvent.click(slowly));
    expect(screen.queryByText("Couldn't play the sound. Tap to try again.")).toBeNull();
    expect(slowly.getAttribute('aria-pressed')).toBe('true');
    // A slowed copy at 1× (a slow playbackRate was silent on iPhone after Hear it).
    const el = play.mock.instances[1] as unknown as HTMLMediaElement;
    expect(el.src).toMatch(/^blob:slow-0\.\d+-/);
    expect(el.playbackRate).toBe(1);
    // Normal stops Slowly: one sound at a time.
    await act(async () => fireEvent.click(screen.getByRole('button', { name: NORMAL })));
    expect(slowly.getAttribute('aria-pressed')).toBe('false');
  });

  it('P1: one empty cell per syllable, the loud one in capitals, and the tip from the syllables', async () => {
    setCheck(check({}));
    await renderLiveReady();
    expect(screen.getByText('Bee 1 of 1')).toBeTruthy();
    expect(
      screen.getByRole('img', {
        name: '3 empty honeycomb cells for MI, ti, gate. MI is the loud part.',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Big letters = loud part')).toBeTruthy();
    expect(screen.queryByText('Pass line 80%')).toBeNull();
    expect(document.querySelector('[data-pass-line]')).toBeNull();
    expect(document.body.textContent).toContain('Fill every cell with honey: say MI loud, ti light, then gate.');
    expect(document.querySelector('[data-stone], [data-chip]')).toBeNull();
  });

  it('P2 and P3: live cells and the voice meter, then the checking board with Native / Your try', async () => {
    setCheck(check({}));
    await renderLiveReady();
    let finish!: () => void;
    upload.mockReturnValueOnce(
      new Promise((res) => (finish = () => res({ check_id: 'c1', status: 'queued', position: 0, eta_s: 1 }))),
    );
    await startTake();
    expect(screen.getByRole('img', { name: 'Empty cells waiting for your voice' })).toBeTruthy();
    expect(screen.getByText('Beep! Say it now')).toBeTruthy();
    env.levels = [...ROOM, ...bars(8, 0.1), ...bars(4, 0.001)];
    await tick(150);
    expect(screen.getByText('Filling as you speak')).toBeTruthy();
    expect(screen.getByText('Keep going…')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\b(good|clear|great)\b/i);
    env.levels = [...ROOM, ...bars(10, 0.1), ...bars(22, 0.001)];
    await tick(150);
    await wait(50);
    expect(screen.getByText('Measuring the honey')).toBeTruthy();
    expect(screen.getByText('Got it. Checking each cell…')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Close' })).toBeNull(); // no close on P3
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: MINE })));
    expect((play.mock.instances[0] as unknown as HTMLMediaElement).src).toBe('blob:me');
    expect(events()).toContainEqual({ name: 'pron_word_played', props: { word_id: 'tw1', voice: 'you', screen: 'P3' } });
    await act(async () => finish());
    await wait(900);
    expect(p4().getByText('Sweet as honey!')).toBeTruthy();
  });

  it('records, stops by itself after the voice, checks and pollinates (last word: back to the bed)', async () => {
    setCheck(check({}));
    await renderLiveReady();
    await startTake();
    expect(screen.getAllByText('Recording').length).toBeGreaterThan(0);
    await speak(10);
    await wait(900);
    expect(upload).toHaveBeenCalledWith('/speaking/check-pronunciation', expect.any(FormData));
    expect(p4().getByText('Sweet as honey!')).toBeTruthy();
    expect(p4().getByText('Hive full · 3 of 3 cells')).toBeTruthy();
    expect(p4().getByText('mitigate is pollinated.')).toBeTruthy();
    // A clean pass: nothing selected, the strip says All pass.
    expect(p4().getByText('All pass')).toBeTruthy();
    expect(p4().getByRole('link', { name: 'Back to the bed' }).getAttribute('href')).toBe('/topics/t1');
    expect(p4().getByRole('button', { name: 'Say it again' })).toBeTruthy(); // last bee, pass
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    await act(async () => fireEvent.click(p4().getByRole('button', { name: MINE })));
    expect((play.mock.instances[0] as unknown as HTMLMediaElement).src).toBe('blob:me');
    await act(async () => fireEvent.click(p4().getByRole('button', { name: NATIVE })));
    expect((play.mock.instances[1] as unknown as HTMLMediaElement).src).not.toBe('blob:me');
    expect(p4().getByRole('button', { name: MINE }).getAttribute('aria-pressed')).toBe('false');
    expect(events()).toContainEqual({
      name: 'pron_word_played',
      props: { word_id: 'tw1', voice: 'you', screen: 'P4' },
    });
    expect(p4().getByRole('img', { name: 'Whole word: 88% match with native' })).toBeTruthy();
  });

  it("says it couldn't hear a quiet take, without calling the server", async () => {
    setCheck(check({}));
    await renderLiveReady();
    await startTake();
    env.levels = [...ROOM, ...bars(20, 0.001)];
    await tick(150);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    expect(screen.getByText("We couldn't hear you")).toBeTruthy();
    expect(screen.getByText('No honey yet')).toBeTruthy();
    expect(screen.getByText("This try doesn't count. Nothing is lost.")).toBeTruthy();
    expect(upload).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Hear the word first' })));
    expect(screen.getByRole('button', { name: 'Start speaking' })).toBeTruthy();
  });

  it('shows another word as P2b, and Try again records straight away', async () => {
    setCheck(check({ status: 'other_word', passed: false, pollinated: false, heard_text: 'medicate' }));
    await renderLiveReady();
    await startTake();
    await speak(10);
    await wait(900);
    expect(screen.getByText('That sounded like another word')).toBeTruthy();
    expect(screen.getByText('We heard “medicate”. Say just “mitigate”.')).toBeTruthy();
    expect(screen.getAllByText('Start with the loud cell: MI').length).toBeGreaterThan(0);
    recorderStart.mockReset();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
    await wait(450);
    expect(recorderStart).toHaveBeenCalled();
    expect(screen.getAllByText('Recording').length).toBeGreaterThan(0);
  });

  it('a retry selects the weak cell; tapping a cell shows its detail and never plays audio; Skip goes to the next word', async () => {
    setCheck(
      check({
        passed: false,
        pollinated: false,
        total: 70,
        syllables: [
          { ipa: 'mɪt', text: 'mi', score: 90, wobbly: false, heard_ipa: null },
          { ipa: 'tɪ', text: 'ti', score: 30, wobbly: true, heard_ipa: 'taɪ' },
          { ipa: 'ɡeɪt', text: 'gate', score: 90, wobbly: false, heard_ipa: null },
        ],
      }),
    );
    await renderLiveReady(['tw1', 'tw2']);
    await startTake();
    await speak(10);
    await wait(900);
    expect(p4().getByText('One cell needs honey')).toBeTruthy();
    expect(p4().getByText('Almost · 2 of 3 cells')).toBeTruthy();
    expect(p4().getByText('Say it once more to pollinate mitigate.')).toBeTruthy();
    const ti = p4().getByRole('button', { name: 'ti: 30% match with native, below the pass line. Show details.' });
    expect(ti.getAttribute('aria-pressed')).toBe('true');
    expect(p4().getByText('ti: 30% match. Sounded like /taɪ/, aim for /tɪ/.')).toBeTruthy();
    expect(p4().getByText('Not yet')).toBeTruthy();
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    await act(async () => fireEvent.click(p4().getByRole('button', { name: 'MI: 90% match with native, pass. Show details.' })));
    expect(p4().getByText('MI: 90% match with native.')).toBeTruthy();
    expect(ti.getAttribute('aria-pressed')).toBe('false');
    expect(play).not.toHaveBeenCalled();
    expect(events().some((e) => e.name === 'pron_chip_played')).toBe(false);
    expect(events()).toContainEqual({
      name: 'pron_scored',
      props: { word_id: 'tw1', overall: 70, result: 'retry', weak_syllable: 'ti', attempt_no: 1 },
    });
    expect(p4().getByRole('img', { name: 'Your sound shape matches the native one except around ti' })).toBeTruthy();
    // Retry on a middle bee: Try again + Skip to next bee.
    expect(p4().getByRole('button', { name: 'Try again' })).toBeTruthy();
    await act(async () => fireEvent.click(p4().getByRole('button', { name: 'Skip to next bee' })));
    expect(await screen.findByText('Bee 2 of 2')).toBeTruthy();
    expect(screen.getAllByText('deforestation').length).toBeGreaterThan(0);
    // Skip doesn't count as a try; the take was cleared on leaving P4.
    expect(events()).toContainEqual({ name: 'pron_skipped', props: { word_id: 'tw1' } });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:me');
  });

  it('one syllable under 80 is a retry even when the word scores 80+ overall', async () => {
    setCheck(
      check({
        passed: false,
        pollinated: false,
        total: 82,
        syllables: [
          { ipa: 'mɪt', text: 'mi', score: 95, wobbly: false, heard_ipa: null },
          { ipa: 'tɪ', text: 'ti', score: 56, wobbly: true, heard_ipa: 'taɪ' },
          { ipa: 'ɡeɪt', text: 'gate', score: 94, wobbly: false, heard_ipa: null },
        ],
      }),
    );
    await renderLiveReady();
    await startTake();
    await speak(10);
    await wait(900);
    expect(p4().getByText('One cell needs honey')).toBeTruthy();
    expect(p4().getByRole('link', { name: 'Back to the bed' })).toBeTruthy(); // the link on the last bee
  });

  it('clears the take on Try again from P4 and logs it as say again', async () => {
    setCheck(
      check({
        passed: false,
        pollinated: false,
        total: 62,
        syllables: [
          { ipa: 'mɪt', text: 'mi', score: 90, wobbly: false, heard_ipa: null },
          { ipa: 'tɪ', text: 'ti', score: 30, wobbly: true, heard_ipa: null },
          { ipa: 'ɡeɪt', text: 'gate', score: 90, wobbly: false, heard_ipa: null },
        ],
      }),
    );
    await renderLiveReady();
    await startTake();
    await speak(10);
    await wait(900);
    // No heard sound: "Cut short".
    expect(p4().getByText('ti: 30% match. Cut short, aim for /tɪ/.')).toBeTruthy();
    vi.mocked(URL.revokeObjectURL).mockClear();
    await act(async () => fireEvent.click(p4().getByRole('button', { name: 'Try again' })));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:me');
    expect(events()).toContainEqual({ name: 'pron_say_again', props: { word_id: 'tw1', from_result: true } });
  });

  const ALMOST = check({
    total: 88,
    syllables: [
      { ipa: 'mɪt', text: 'mi', score: 92, wobbly: false, heard_ipa: null },
      { ipa: 'tɪ', text: 'ti', score: 82, wobbly: false, heard_ipa: null },
      { ipa: 'ɡeɪt', text: 'gate', score: 90, wobbly: false, heard_ipa: null },
    ],
  });

  it('almost perfect on the last bee: Back to the bed + Polish {syl}, the close cell selected, logged as almost', async () => {
    setCheck(ALMOST);
    await renderLiveReady();
    await startTake();
    await speak(10);
    await wait(900);
    expect(p4().getByText('Nearly perfect!')).toBeTruthy();
    expect(p4().getByText('It counts! mitigate is pollinated.')).toBeTruthy();
    expect(p4().getByText('Hive full · 3 of 3 cells')).toBeTruthy();
    expect(p4().getByText('ti: 82% match. Just past the line, aim for /tɪ/.')).toBeTruthy();
    expect(p4().getByRole('link', { name: 'Back to the bed' })).toBeTruthy();
    expect(p4().getByRole('button', { name: 'Polish ti: say it again' })).toBeTruthy();
    const ti = p4().getByRole('button', {
      name: 'ti: 82% match with native, just over the pass line. Show details.',
    });
    expect(ti.getAttribute('aria-pressed')).toBe('true');
    expect(events()).toContainEqual({
      name: 'pron_scored',
      props: { word_id: 'tw1', overall: 88, result: 'almost', weak_syllable: 'ti', attempt_no: 1 },
    });
  });

  it('a scorer split unlike the cells is a scoring error: Check again / Record again', async () => {
    setCheck(check({ syllables: [{ ipa: 'mitigate', text: 'mitigate', score: 88, wobbly: false, heard_ipa: null }] }));
    await renderLiveReady();
    await startTake();
    await speak(10);
    await wait(900);
    expect(screen.getByRole('button', { name: 'Check again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record again' })).toBeTruthy();
    expect(screen.queryByText('Sweet as honey!')).toBeNull();
  });

  it('skips a word without stored syllables (logged), back to the bed when it was the last', async () => {
    setCheck(check({}), { nextBlocked: true });
    await renderLiveReady(['tw1', 'tw2']);
    await startTake();
    await speak(10);
    await wait(900);
    await act(async () => fireEvent.click(p4().getByRole('button', { name: 'Next bee: deforestation' })));
    await act(async () => undefined);
    expect(events()).toContainEqual({
      name: 'pron_word_blocked',
      props: { word_id: 'tw2', reason: 'no_syllables' },
    });
    expect(replace).toHaveBeenCalledWith('/topics/t1');
  });

  it('Normal logs the native word played on P1', async () => {
    setCheck(check({}));
    await renderLiveReady();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: NORMAL })));
    expect(events()).toContainEqual({
      name: 'pron_word_played',
      props: { word_id: 'tw1', voice: 'native', screen: 'P1' },
    });
  });

  it('SP0 the first time: Allow microphone records; not shown again', async () => {
    window.localStorage.removeItem('dygo:mic-asked');
    setCheck(check({}));
    await renderLiveReady();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
    expect(screen.getByText('Let your garden hear you')).toBeTruthy();
    expect(screen.getByText('Your recording is checked, then deleted')).toBeTruthy();
    expect(recorderStart).not.toHaveBeenCalled();
    env.levels = ROOM;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Allow microphone' })));
    await wait(300 + 150);
    expect(recorderStart).toHaveBeenCalled();
    expect(window.localStorage.getItem('dygo:mic-asked')).toBe('1');
  });

  it('SP0 denied: how to turn the mic on; Practise listening goes back to P1', async () => {
    requestMic.mockRejectedValue(Object.assign(new Error('denied'), { kind: 'denied' }));
    setCheck(check({}));
    await renderLiveReady();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
    expect(screen.getByText('Your microphone is off')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Settings' })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Practise listening instead' })));
    expect(screen.getByRole('button', { name: 'Start speaking' })).toBeTruthy();
    expect(recorderStart).not.toHaveBeenCalled();
  });

  it('a noisy room is P2b noisy, without calling the server, and logged', async () => {
    setCheck(check({}));
    await renderLiveReady();
    env.levels = bars(6, 0.05); // a loud room before the beep
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start speaking' })));
    await wait(300 + 150);
    env.levels = [...bars(6, 0.05), ...bars(20, 0.06)];
    await tick(150);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })));
    expect(screen.getByText('Too noisy to hear')).toBeTruthy();
    expect(upload).not.toHaveBeenCalled();
    expect(events()).toContainEqual({ name: 'pron_not_heard', props: { word_id: 'tw1', reason: 'noisy' } });
  });

  it('Say all runs every bee asked for (no cap of three)', async () => {
    setCheck(check({}));
    await renderLiveReady(['tw1', 'tw2', 'tw3', 'tw4']);
    expect(screen.getAllByText('Bee 1 of 4').length).toBeGreaterThan(0);
  });

  it('leaving P4 by its link (the page unmounts) deletes the take', async () => {
    setCheck(check({}));
    const { unmount } = await renderLiveReady();
    await startTake();
    await speak(10);
    await wait(900);
    expect(p4().getByText('Sweet as honey!')).toBeTruthy();
    vi.mocked(URL.revokeObjectURL).mockClear();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:me');
  });
});
