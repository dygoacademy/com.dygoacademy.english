import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { forAccent } from '@/lib/speaking/session';

import { SpeakListenScreen, type SpeakListenScreenProps } from './SpeakListenScreen';
import { SpeakRecordingScreen, type SpeakRecordingScreenProps } from './SpeakRecordingScreen';
import { SpeakCompareScreen, type SpeakCompareScreenProps } from './SpeakCompareScreen';
import { SpeakDoneScreen } from './SpeakDoneScreen';
import {
  SPEAK_FIXTURE_ITEM,
  SPEAK_FIXTURE_ITEM_VI,
  SPEAK_FIXTURE_RESULT,
  SPEAK_FIXTURE_SESSION,
} from './speakFixtures';

const ENV = Array.from({ length: 300 }, (_, i) => Math.abs(Math.sin(i / 8)));

function listen(over: Partial<SpeakListenScreenProps> = {}) {
  const props: SpeakListenScreenProps = {
    item: SPEAK_FIXTURE_ITEM,
    index: 1,
    total: 5,
    closeHref: '/missions',
    accent: 'UK',
    onAccent: vi.fn(),
    rate: 1,
    onRate: vi.fn(),
    playing: false,
    onPlay: vi.fn(),
    nativeLevels: ENV,
    onMic: vi.fn(),
    ...over,
  };
  renderWithIntl(<SpeakListenScreen {...props} />);
  return props;
}

describe('SpeakListenScreen (SP1)', () => {
  it('shows the word card, the sentence with the target, the native card and the mic', () => {
    listen();
    expect(screen.getByText('Speaking · The Pond')).toBeTruthy();
    expect(screen.getByText('2/5')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('2');
    expect(screen.getByText('mitigate', { selector: 'span[lang="en"]' })).toBeTruthy();
    expect(screen.getByText('mɪt', { selector: 'b' })).toBeTruthy(); // stressed syllable
    expect(screen.getByText('C1')).toBeTruthy();
    expect(screen.getByText('verb')).toBeTruthy();
    expect(screen.getByText('mitigate', { selector: 'b' })).toBeTruthy(); // target in the sentence
    expect(screen.getByRole('img', { name: /native speaker saying the sentence/ })).toBeTruthy();
    expect(screen.getByText('Listen, then say the whole sentence')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Close' }).getAttribute('href')).toBe('/missions');
  });

  it('wires the accent and speed chips, play and the mic', () => {
    const p = listen();
    fireEvent.click(screen.getByRole('button', { name: 'US' }));
    expect(p.onAccent).toHaveBeenCalledWith('US');
    expect(screen.getByRole('button', { name: 'UK' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '0.75×' }));
    expect(p.onRate).toHaveBeenCalledWith(0.75);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(p.onPlay).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start speaking' }));
    expect(p.onMic).toHaveBeenCalled();
  });

  it('shows Playing with the sweep, hides the mic without support, shows a notice', () => {
    listen({ playing: true, micAvailable: false, notice: <span>Mic is off</span> });
    expect(screen.getByRole('button', { name: 'Playing' })).toBeTruthy();
    expect(screen.getByTestId('wave-playhead')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start speaking' })).toBeNull();
    expect(screen.getByText('Mic is off')).toBeTruthy();
  });

  it('puts the translation first when there is one', () => {
    listen({ item: SPEAK_FIXTURE_ITEM_VI });
    const tr = screen.getByText('giảm nhẹ, làm dịu bớt');
    expect(tr.getAttribute('lang')).toBe('vi');
    expect(screen.getByText('to make something bad less harmful or serious')).toBeTruthy();
  });
});

function recording(over: Partial<SpeakRecordingScreenProps> = {}) {
  const props: SpeakRecordingScreenProps = {
    item: SPEAK_FIXTURE_ITEM,
    index: 0,
    total: 5,
    closeHref: '/missions',
    timings: SPEAK_FIXTURE_ITEM.timings_us,
    ipa: SPEAK_FIXTURE_ITEM.ipa_us,
    nativeLevels: ENV,
    liveLevels: [0.1, 0.12, 0.08],
    elapsedMs: 2400,
    targetMs: 5000,
    onStop: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  };
  renderWithIntl(<SpeakRecordingScreen {...props} />);
  return props;
}

describe('SpeakRecordingScreen (SP2)', () => {
  it('shows the timer, live waveform, fill hint and stress tip', () => {
    recording();
    expect(screen.getByText('Recording')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('0:02 / 0:05');
    expect(screen.getByRole('img', { name: /Your voice, live/ })).toBeTruthy();
    expect(screen.getAllByTestId('live-bar').length).toBeGreaterThan(0);
    expect(
      screen.getByText('The pale green shape is the native speaker. Try to fill it.'),
    ).toBeTruthy();
    expect(screen.getByText('mitigate /ˈmɪt.ɪ.ɡeɪt/: push on mɪt')).toBeTruthy();
  });

  it('follows along: words not reached yet are faded', () => {
    const t = SPEAK_FIXTURE_ITEM.timings_us!;
    recording({ elapsedMs: t.words[2].start * 1000 + 10 });
    const sentence = screen.getByText('Planting', { exact: false }).closest('p')!;
    const faded = within(sentence)
      .getAllByText(/./)
      .filter((el) => el.getAttribute('data-faded') === 'true')
      .map((el) => el.textContent?.trim());
    expect(faded[0]).toBe('can');
    expect(faded).not.toContain('trees');
  });

  it('stops and cancels', () => {
    const p = recording();
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
    expect(p.onStop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(p.onCancel).toHaveBeenCalled();
  });
});

describe('fixtures and clip choice', () => {
  it('has a five-sentence session and falls back to the other accent', () => {
    expect(SPEAK_FIXTURE_SESSION.items).toHaveLength(5);
    expect(forAccent(SPEAK_FIXTURE_ITEM, 'UK').url).toMatch(/uk\.m4a$/);
    expect(forAccent({ ...SPEAK_FIXTURE_ITEM, audio_uk_url: null }, 'UK').url).toMatch(/us\.m4a$/);
  });
});

function compare(over: Partial<SpeakCompareScreenProps> = {}) {
  const props: SpeakCompareScreenProps = {
    item: SPEAK_FIXTURE_ITEM,
    index: 1,
    total: 5,
    closeHref: '/missions',
    timings: SPEAK_FIXTURE_ITEM.timings_us,
    ipa: SPEAK_FIXTURE_ITEM.ipa_us,
    result: SPEAK_FIXTURE_RESULT,
    view: 'overlay',
    onView: vi.fn(),
    playing: null,
    onPlayNative: vi.fn(),
    onPlayYou: vi.fn(),
    onTryAgain: vi.fn(),
    onNext: vi.fn(),
    ...over,
  };
  renderWithIntl(<SpeakCompareScreen {...props} />);
  return props;
}

describe('SpeakCompareScreen (SP3)', () => {
  it('shows durations, the compare waveform, word marks, stage and tip', () => {
    compare();
    expect(screen.getByText('Your sentence')).toBeTruthy();
    expect(screen.getByText(/3\.4s · native/)).toBeTruthy();
    expect(screen.getByRole('img', { name: /in clay over the native/ })).toBeTruthy();
    expect(screen.getByText('mɪt is too soft')).toBeTruthy();
    expect(screen.getByText('In bloom · 82% match')).toBeTruthy();
    expect(screen.getByText('Fruit at 90%').tagName).toBe('B');
    const title = screen.getByText(
      (_, el) => el?.textContent === 'In mitigate, make mɪt stronger' && el.tagName === 'SPAN',
    );
    expect(title.querySelectorAll('b')).toHaveLength(2);
    expect(screen.getByText(/Say ˈmɪt-ɪ-ɡeɪt\./)).toBeTruthy();
  });

  it('switches view, plays native / you, tries again and goes next', () => {
    const p = compare();
    fireEvent.click(screen.getByRole('radio', { name: 'Side by side' }));
    expect(p.onView).toHaveBeenCalledWith('stacked');
    fireEvent.click(screen.getByRole('button', { name: 'Native' }));
    fireEvent.click(screen.getByRole('button', { name: 'You' }));
    expect(p.onPlayNative).toHaveBeenCalled();
    expect(p.onPlayYou).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next word' }));
    expect(p.onTryAgain).toHaveBeenCalled();
    expect(p.onNext).toHaveBeenCalled();
  });

  it('shows a spinner while scoring and blocks Next', () => {
    compare({ result: null });
    expect(screen.getByRole('status')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Next word' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe('SpeakDoneScreen (SP4)', () => {
  it('counts the words, draws a plant each, lists best scores and the pattern', () => {
    renderWithIntl(
      <SpeakDoneScreen
        closeHref="/missions"
        words={[
          { word: 'drought', stage: 'fruit', pct: 94, levels: [0.2, 0.8, 0.4] },
          { word: 'mitigate', stage: 'bloom', pct: 82, levels: [0.3, 0.9] },
          { word: 'deteriorate', stage: 'sprout', pct: 58, levels: [0.5] },
        ]}
        pattern={{
          tipKey: 'speak.tip.stress',
          tipParams: { word: 'deteriorate', syllable: '1' },
          ipa: '/dɪˈtɪə.ri.ə.reɪt/',
        }}
      />,
    );
    expect(screen.getByText('Speaking done')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'You said 3 words out loud' })).toBeTruthy();
    const garden = screen.getByRole('img', { name: '3 plants, one for each word you spoke' });
    expect(garden.querySelectorAll('svg[data-stage]')).toHaveLength(3);
    expect(screen.getByText('94%').className).toContain('bg-on-forest-muted');
    expect(screen.getByText('58%').className).toContain('bg-gold-soft');
    expect(screen.getByText('Pattern to watch:')).toBeTruthy();
    expect(screen.getByText('tɪə', { selector: 'b' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to garden' }).getAttribute('href')).toBe(
      '/missions',
    );
  });

  it('says one word in the singular and has no pattern when all flowed', () => {
    renderWithIntl(
      <SpeakDoneScreen
        closeHref="/missions"
        words={[{ word: 'drought', stage: 'fruit', pct: 95, levels: [] }]}
        pattern={null}
      />,
    );
    expect(screen.getByRole('heading', { name: 'You said 1 word out loud' })).toBeTruthy();
    expect(screen.queryByText('Pattern to watch:')).toBeNull();
  });
});
