import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CompareWaveform } from './CompareWaveform';
import { LiveWaveform, liveBars } from './LiveWaveform';
import { Waveform } from './Waveform';
import { targetSpan, toBars, WAVE_BARS } from './waveformBars';

const ENV = Array.from({ length: 330 }, (_, i) => Math.abs(Math.sin(i / 9)));

describe('toBars / targetSpan', () => {
  it('buckets any envelope into 72 bars scaled to the loudest', () => {
    const bars = toBars(ENV);
    expect(bars).toHaveLength(WAVE_BARS);
    expect(Math.max(...bars)).toBe(1);
    expect(toBars([])).toEqual(new Array(WAVE_BARS).fill(0));
    expect(toBars([0, 0, 0], 3)).toEqual([0, 0, 0]);
    expect(toBars([1, 3], 4)).toEqual([1 / 3, 1 / 3, 1, 1]);
  });

  it('gives the target word as fractions of the clip', () => {
    const timings = {
      duration: 4,
      words: [
        { text: 'help', start: 0.2, end: 1, syllables: [] },
        { text: 'mitigate', start: 1, end: 2, syllables: [] },
      ],
    };
    expect(targetSpan(timings, 1)).toEqual({ start: 0.25, end: 0.5 });
    expect(targetSpan(timings, 5)).toBeNull();
    expect(targetSpan(null, 0)).toBeNull();
  });
});

describe('Waveform (SP1)', () => {
  it('draws 72 green bars, the target band and the label', () => {
    const { container } = render(
      <Waveform levels={ENV} target={{ start: 0.4, end: 0.55 }} label="Native speaker" />,
    );
    expect(screen.getByRole('img', { name: 'Native speaker' })).toBeTruthy();
    const band = screen.getByTestId('wave-target');
    expect(Number(band.getAttribute('x'))).toBeCloseTo(0.4 * 322);
    expect(container.querySelectorAll('rect[fill="var(--stage-tree-canopy)"]')).toHaveLength(72);
    expect(screen.queryByTestId('wave-playhead')).toBeNull();
  });

  it('shows the sweep while playing, timed to the clip', () => {
    const { container } = render(<Waveform levels={ENV} playingMs={3300} label="x" />);
    expect(screen.getByTestId('wave-playhead')).toBeTruthy();
    const head = container.querySelector('.dygo-wave-head') as SVGElement;
    expect(head.style.animationDuration).toBe('3300ms');
  });
});

describe('LiveWaveform (SP2)', () => {
  it('places live bars on the native timeline', () => {
    // native 3.6 s → 72 bars of 0.05 s = one live level (20/s) per bar
    expect(liveBars(new Array(10).fill(0.1), 3.6)).toHaveLength(10);
    expect(liveBars(new Array(10).fill(0.1), 3.6)[0]).toBeCloseTo(0.5);
    expect(liveBars(new Array(500).fill(1), 3.6)).toHaveLength(72); // capped, values capped
    expect(liveBars(new Array(500).fill(1), 3.6)[0]).toBe(1);
    expect(liveBars([], 3)).toEqual([]);
  });

  it('draws the pale native shape and the learner so far', () => {
    render(
      <LiveWaveform
        nativeLevels={ENV}
        nativeDuration={3.6}
        liveLevels={new Array(30).fill(0.1)}
        label="live"
      />,
    );
    expect(screen.getAllByTestId('live-bar')).toHaveLength(30);
  });
});

describe('CompareWaveform (SP3)', () => {
  it('overlay: pale native + thin clay bars, amber band', () => {
    const { container } = render(
      <CompareWaveform
        native={ENV}
        user={ENV.slice(20)}
        view="overlay"
        target={{ start: 0.39, end: 0.56 }}
        label="cmp"
      />,
    );
    expect(container.querySelector('svg')?.getAttribute('data-view')).toBe('overlay');
    expect(container.querySelectorAll('rect[fill="var(--stage-sprout)"]')).toHaveLength(72);
    expect(
      container.querySelectorAll('rect[fill="var(--color-primary)"][width="1.6"]'),
    ).toHaveLength(72);
    expect(screen.getByTestId('wave-target').getAttribute('fill')).toBe('var(--color-gold-light)');
  });

  it('side by side: native row on top, learner row 56 below', () => {
    render(<CompareWaveform native={ENV} user={ENV} view="stacked" label="cmp" />);
    expect(screen.getByTestId('row-native').querySelectorAll('rect')).toHaveLength(72);
    expect(screen.getByTestId('row-user').getAttribute('transform')).toBe('translate(0,56)');
    expect(screen.queryByTestId('wave-target')).toBeNull();
  });
});
