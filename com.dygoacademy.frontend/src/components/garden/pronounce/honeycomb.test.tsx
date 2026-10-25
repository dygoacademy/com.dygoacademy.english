import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PASS_LINE_Y } from '@/lib/pronunciation/comb';
import { renderWithIntl } from '@/test/render';

import viMessages from '../../../../messages/vi-VN.json';

import { VoiceMeterComb } from './CombMeters';
import { HoneycombBoard } from './HoneycombBoard';
import { ListenCard } from './ListenCard';
import { PronounceScreen } from './PronounceScreen';

const MITIGATE = [
  { text: 'mi', stressed: true },
  { text: 'ti', stressed: false },
  { text: 'gate', stressed: false },
];

describe('HoneycombBoard', () => {
  it('draws one cell per syllable (2–4) and the stressed one in capitals', () => {
    for (const n of [2, 3, 4]) {
      const syl = Array.from({ length: n }, (_, k) => ({ text: `s${'abcd'[k]}`, stressed: k === 0 }));
      const { container, unmount } = renderWithIntl(
        <HoneycombBoard mode="empty" syllables={syl} title="T" passLine="Pass line 80%" label="board" />,
      );
      expect(container.querySelectorAll('clipPath')).toHaveLength(n);
      expect(screen.getByText('SA')).toBeTruthy();
      unmount();
    }
  });

  it('draws the pass line and its legend in result mode only', () => {
    for (const mode of ['empty', 'live', 'checking', 'dim'] as const) {
      const { container, unmount } = renderWithIntl(
        <HoneycombBoard mode={mode} syllables={MITIGATE} title="T" passLine="Pass line 80%" label="b" reached={1} />,
      );
      expect(container.querySelector('[data-pass-line]')).toBeNull();
      expect(screen.queryByText('Pass line 80%')).toBeNull();
      unmount();
    }
    const { container } = renderWithIntl(
      <HoneycombBoard
        mode="result"
        syllables={MITIGATE}
        title="T"
        passLine="Pass line 80%"
        label="r"
        result={{
          cells: MITIGATE.map(() => ({ score: 95, status: 'pass' as const, aria: 'a' })),
          selected: -1,
          onSelect: () => {},
          detail: { tag: 'All pass', tone: 'all', text: 'x' },
        }}
      />,
    );
    expect(container.querySelector('[data-pass-line]')?.getAttribute('data-pass-line')).toBe(String(PASS_LINE_Y));
    expect(screen.getByText('Pass line 80%')).toBeTruthy();
    expect(PASS_LINE_Y).toBe(76);
  });

  it('two boards never share clip-path ids', () => {
    const { container } = renderWithIntl(
      <>
        <HoneycombBoard mode="checking" syllables={MITIGATE} title="T" label="a" />
        <HoneycombBoard mode="checking" syllables={MITIGATE} title="T" label="b" />
      </>,
    );
    const ids = [...container.querySelectorAll('clipPath')].map((c) => c.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('live: pale honey only in the reached cells, the current one bubbling', () => {
    const { container } = renderWithIntl(
      <HoneycombBoard mode="live" syllables={MITIGATE} title="T" label="l" reached={2} />,
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

describe('PronounceScreen (honeycomb screens)', () => {
  const clips = { normal: { src: null }, slow: { src: null }, native: { src: null }, you: { src: null } };
  const base = {
    word: 'mitigate',
    ipa: '/ˈmɪt.ɪ.ɡeɪt/',
    meaning: 'to make something less harmful',
    syllables: MITIGATE,
    index: 0,
    total: 3,
    closeHref: '/topics/t1',
    clips,
  };
  const result = (scores: number[], heard: (string | null)[] = [null, null, null]) => ({
    word: 'mitigate',
    syllables: MITIGATE.map((s, k) => ({ ...s, score: scores[k], targetIpa: ['ˈmɪ', 'tɪ', 'ɡeɪt'][k], heardIpa: heard[k] })),
    nativeAudioUrl: '',
    learnerAudioUrl: '',
    round: { index: 0, total: 3, nextWord: 'deforestation' },
  });

  it('P2b: each reason has its title, body and two tips; Try again and Hear the word first', () => {
    const onTryAgain = vi.fn();
    const cases = [
      ['quiet', "We couldn't hear you", 'The bee heard almost nothing.', 'Speak a little louder than normal'],
      ['noisy', 'Too noisy to hear', 'There was a lot of sound around you.', 'Move somewhere a bit quieter'],
      ['other', 'That sounded like another word', 'We heard “medicate”. Say just “mitigate”.', 'Start with the loud cell: MI'],
    ] as const;
    for (const [reason, title, body, tip] of cases) {
      const { unmount } = renderWithIntl(
        <PronounceScreen {...base} phase="notHeard" reason={reason} heard="medicate" onTryAgain={onTryAgain} />,
      );
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(body)).toBeTruthy();
      expect(screen.getAllByText(tip).length).toBeGreaterThan(0);
      expect(screen.getByRole('img', { name: 'Empty cells for MI, ti, gate: the bee heard nothing yet' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      unmount();
    }
    expect(onTryAgain).toHaveBeenCalledTimes(3);
  });

  it('P4: keyboard order is cells, then the play buttons, then the buttons; the sub line never repeats a score', () => {
    renderWithIntl(<PronounceScreen {...base} phase="result" result={result([95, 56, 94], [null, 'taɪ', null])} />);
    const order = [...document.querySelectorAll('[data-screen="P4"] button, [data-screen="P4"] a')].map(
      (el) => el.getAttribute('aria-label') ?? el.textContent,
    );
    const at = (re: RegExp) => order.findIndex((x) => x && re.test(x));
    expect(at(/^gate: 94%/)).toBeLessThan(at(/^Play the native speaker/));
    expect(at(/^Play your recording/)).toBeLessThan(at(/^Try again/));
    expect(at(/^Try again/)).toBeLessThan(at(/^Skip to next bee/));
    expect(screen.getByText('Say it once more to pollinate mitigate.').textContent).not.toMatch(/\d/);
    // The listen card has only the two labels: no durations, no Both.
    expect(screen.queryByText(/Both|\d\.\ds/)).toBeNull();
  });

  it('P4: selecting a cell changes the detail strip; a new result resets the selection', () => {
    const { rerender } = renderWithIntl(<PronounceScreen {...base} phase="result" result={result([95, 82, 94])} />);
    expect(screen.getByText('ti: 82% match. Just past the line, aim for /tɪ/.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'gate: 94% match with native, pass. Show details.' }));
    expect(screen.getByText('gate: 94% match with native.')).toBeTruthy();
    rerender(<PronounceScreen {...base} phase="result" result={result([95, 91, 94])} />);
    expect(screen.getByText('Every cell filled past the 80% line. Tap one to see its score.')).toBeTruthy();
    expect(screen.getByText('Sweet as honey!')).toBeTruthy();
  });

  it('speaks Vietnamese from vi-VN.json', () => {
    render(
      <NextIntlClientProvider locale="vi-VN" messages={viMessages}>
        <PronounceScreen {...base} phase="result" result={result([95, 56, 94], [null, 'taɪ', null])} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Còn một ô thiếu mật')).toBeTruthy();
    expect(screen.getByText('Chưa đạt')).toBeTruthy();
  });
});
