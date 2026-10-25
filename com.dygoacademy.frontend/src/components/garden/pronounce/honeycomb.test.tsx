import { fireEvent, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PASS_LINE_Y } from '@/lib/pronunciation/comb';
import { renderWithIntl } from '@/test/render';

import { VoiceMeterComb } from './CombMeters';
import { HoneycombBoard } from './HoneycombBoard';
import { ListenCard } from './ListenCard';

const MITIGATE = [
  { text: 'mi', stressed: true },
  { text: 'ti', stressed: false },
  { text: 'gate', stressed: false },
];

describe('HoneycombBoard', () => {
  it('draws one cell per syllable (2–4), the pass line at 80%, and the stressed one in capitals', () => {
    for (const n of [2, 3, 4]) {
      const syl = Array.from({ length: n }, (_, k) => ({ text: `s${'abcd'[k]}`, stressed: k === 0 }));
      const { container, unmount } = renderWithIntl(
        <HoneycombBoard mode="empty" syllables={syl} title="T" passLine="Pass line 80%" label="board" />,
      );
      expect(container.querySelectorAll('clipPath')).toHaveLength(n);
      expect(container.querySelector('[data-pass-line]')?.getAttribute('data-pass-line')).toBe(String(PASS_LINE_Y));
      expect(screen.getByText('SA')).toBeTruthy();
      unmount();
    }
    expect(PASS_LINE_Y).toBe(76);
  });

  it('two boards never share clip-path ids', () => {
    const { container } = renderWithIntl(
      <>
        <HoneycombBoard mode="checking" syllables={MITIGATE} title="T" passLine="P" label="a" />
        <HoneycombBoard mode="checking" syllables={MITIGATE} title="T" passLine="P" label="b" />
      </>,
    );
    const ids = [...container.querySelectorAll('clipPath')].map((c) => c.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('live: pale honey only in the reached cells, the current one bubbling', () => {
    const { container } = renderWithIntl(
      <HoneycombBoard mode="live" syllables={MITIGATE} title="T" passLine="P" label="l" reached={2} />,
    );
    const honey = container.querySelectorAll('g[clip-path] rect');
    expect(honey).toHaveLength(2);
    honey.forEach((r) => expect(r.getAttribute('fill')).toBe('var(--comb-honey-pale)'));
    expect(honey[1].getAttribute('class')).toBe('comb-bubble');
  });

  it('result: real buttons, a tap selects (never plays), the strip is aria-live', () => {
    const onSelect = vi.fn();
    renderWithIntl(
      <HoneycombBoard
        mode="result"
        syllables={MITIGATE}
        title="T"
        passLine="P"
        label="r"
        result={{
          cells: [
            { score: 95, status: 'pass', aria: 'MI: 95%' },
            { score: 56, status: 'fail', aria: 'ti: 56% match with native, below the pass line. Show details.' },
            { score: 94, status: 'pass', aria: 'gate: 94%' },
          ],
          selected: 1,
          onSelect,
          detail: { tag: 'Not yet', tone: 'fail', text: 'ti: 56% match.' },
        }}
      />,
    );
    const ti = screen.getByRole('button', { name: /ti: 56% match with native, below the pass line/ });
    expect(ti.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'MI: 95%' }));
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(screen.getByText('ti: 56% match.').closest('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
  });
});

describe('ListenCard', () => {
  const buttons = [
    { key: 'native', label: 'Native', sub: '1. Listen', tone: 'green', aria: 'Play the native speaker' },
    { key: 'you', label: 'Your try', sub: '2. Compare', tone: 'clay', aria: 'Play your recording' },
  ] as const;

  it('states: loading is busy, playing is pressed, an error shows the line', () => {
    const onTap = vi.fn();
    const { rerender } = renderWithIntl(
      <ListenCard
        buttons={buttons}
        stateOf={(k) => (k === 'native' ? 'loading' : 'idle')}
        onTap={onTap}
        playing="tint"
        loadingText="Loading…"
        errorText="Couldn't play the sound. Tap to try again."
      />,
    );
    const native = screen.getByRole('button', { name: 'Play the native speaker' });
    expect(native.getAttribute('aria-busy')).toBe('true');
    expect(native.textContent).toContain('Loading…');
    rerender(
      <ListenCard
        buttons={buttons}
        stateOf={(k) => (k === 'you' ? 'error' : 'playing')}
        onTap={onTap}
        playing="tint"
        loadingText="Loading…"
        errorText="Couldn't play the sound. Tap to try again."
      />,
    );
    expect(screen.getByRole('button', { name: 'Play the native speaker' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain("Couldn't play the sound");
    fireEvent.click(screen.getByRole('button', { name: 'Play your recording' }));
    expect(onTap).toHaveBeenCalledWith('you');
  });
});

describe('VoiceMeterComb', () => {
  it('lights hexes from the level, none during the beep, and never says good or clear', () => {
    const { container, rerender } = renderWithIntl(
      <VoiceMeterComb level={0.9} recording={false} label="Your voice" status="Starting…" />,
    );
    expect(container.querySelector('[data-lit]')?.getAttribute('data-lit')).toBe('0');
    rerender(<VoiceMeterComb level={0.5} recording label="Your voice" status="Recording" />);
    expect(container.querySelector('[data-lit]')?.getAttribute('data-lit')).toBe('11');
    expect(container.textContent).not.toMatch(/good|clear|great/i);
  });
});
