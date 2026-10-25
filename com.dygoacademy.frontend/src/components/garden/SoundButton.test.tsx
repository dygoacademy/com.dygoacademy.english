import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetPlayerForTest } from '@/hooks/usePlayer';
import { renderWithIntl } from '@/test/render';

import { SoundButton, SoundError } from './SoundButton';

describe('SoundButton (one sound button, one player)', () => {
  beforeEach(() => {
    resetPlayerForTest();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  function both() {
    renderWithIntl(
      <>
        <SoundButton tag="native" voice="native" variant="pill" label="Native" src="https://m/n.m4a" sub="0.8s" />
        <SoundButton tag="you" voice="you" variant="pill" label="You" src="blob:me" />
        <SoundButton tag="none" voice="native" variant="hear" label="Hear it" src={null} />
        <SoundError tags={['none']} />
      </>,
    );
    return {
      native: screen.getByRole('button', { name: 'Native' }),
      you: screen.getByRole('button', { name: 'You' }),
      none: screen.getByRole('button', { name: 'Hear it' }),
    };
  }

  it('only one sound plays at a time: starting You stops Native', async () => {
    const b = both();
    await act(async () => fireEvent.click(b.native));
    expect(b.native.getAttribute('data-sound')).toBe('playing');
    await act(async () => fireEvent.click(b.you));
    expect(b.you.getAttribute('data-sound')).toBe('playing');
    expect(b.native.getAttribute('data-sound')).toBe('ready');
  });

  it('a tap while playing stops it', async () => {
    const b = both();
    await act(async () => fireEvent.click(b.native));
    await act(async () => fireEvent.click(b.native));
    expect(b.native.getAttribute('data-sound')).toBe('ready');
  });

  it("no clip: couldn't play, with the board's line, until another play", async () => {
    const b = both();
    await act(async () => fireEvent.click(b.none));
    expect(b.none.getAttribute('data-sound')).toBe('error');
    expect(screen.getByText("Couldn't play the sound. Tap to try again.")).toBeTruthy();
    await act(async () => fireEvent.click(b.native));
    expect(screen.queryByText("Couldn't play the sound. Tap to try again.")).toBeNull();
  });
});
