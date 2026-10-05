import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const beep = vi.fn();
const recorderStart = vi.fn();
let decoded = new Float32Array(16000);

vi.mock('@/lib/speaking/beep', () => ({ beepAndVibrate: (...a: unknown[]) => beep(...a) }));
vi.mock('@/hooks/useLiveLevels', () => ({
  LIVE_LEVELS_PER_SECOND: 20,
  useLiveLevels: () => [],
}));
vi.mock('@/lib/speaking/audio', async (orig) => ({
  ...(await orig<typeof import('@/lib/speaking/audio')>()),
  resumeAudioContext: () => Promise.resolve({}),
  getAudioContext: () => ({}),
  requestMic: () => Promise.resolve({ getTracks: () => [] }),
  releaseStream: vi.fn(),
  decodeForScoring: () => Promise.resolve({ samples: decoded, sampleRate: 16000 }),
  createRecorder: () => ({
    kind: 'media-recorder',
    start: recorderStart,
    cancel: vi.fn(),
    stop: () =>
      Promise.resolve({
        blob: new Blob(['x'], { type: 'audio/mp4' }),
        mimeType: 'audio/mp4',
        durationMs: 3200,
      }),
  }),
}));

import { FLOW_COPY, FlowCheck } from './FlowCheck';

async function runToRecording() {
  render(<FlowCheck />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: FLOW_COPY.start })));
  expect(screen.getByText('Get ready… 3')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: FLOW_COPY.skip }));
  expect(beep).toHaveBeenCalledTimes(1);
  expect(recorderStart).not.toHaveBeenCalled(); // 150 ms after the beep
  await act(async () => {
    vi.advanceTimersByTime(200);
  });
  expect(recorderStart).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('flow-live').textContent).toContain('quiet for 0.0 / 2.0 s');
}

describe('FlowCheck (dev page, S19)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] });
    beep.mockReset();
    recorderStart.mockReset();
    decoded = new Float32Array(16000);
  });
  afterEach(() => vi.useRealTimers());

  it('counts down, beeps, records 150 ms later; a tap stops it; no beep in a quiet clip', async () => {
    await runToRecording();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: FLOW_COPY.stop })));
    const result = await waitFor(() => screen.getByTestId('flow-result'));
    expect(result.textContent).toContain('tap');
    expect(result.textContent).toContain('3.20 s · audio/mp4');
    expect(result.textContent).toContain('beep in clipno');
    expect(result.textContent).toContain('auto-stop sawvoice heard no');
  });

  it('flags a beep that leaked into the first 200 ms', async () => {
    decoded = Float32Array.from({ length: 16000 }, (_, i) =>
      i < 3200 ? 0.3 * Math.sin((2 * Math.PI * 880 * i) / 16000) : 0,
    );
    await runToRecording();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: FLOW_COPY.stop })));
    const result = await waitFor(() => screen.getByTestId('flow-result'));
    expect(result.textContent).toContain('YES, leaked');
  });
});
