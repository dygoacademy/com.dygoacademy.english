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
  SPEAK_FIXTURE_RESULT_CANVAS,
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
    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }));
    expect(p.onMic).toHaveBeenCalled();
  });

  it('shows Playing with the sweep, hides the mic without support, shows a notice', () => {
    listen({ playing: true, micAvailable: false, notice: <span>Mic is off</span> });
    expect(screen.getByRole('button', { name: 'Playing' })).toBeTruthy();
    expect(screen.getByTestId('wave-playhead')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start recording' })).toBeNull();
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
    onSkipCountdown: vi.fn(),
    onStop: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  };
  renderWithIntl(<SpeakRecordingScreen {...props} />);
  return props;
}

describe('SpeakRecordingScreen (SP2)', () => {
  it('shows the elapsed time, live waveform, fill hint and stress tip', () => {
    recording();
    expect(screen.getByText('Recording')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('0:02'); // no maximum (handover v2)
    expect(screen.getByRole('img', { name: /Your voice, live/ })).toBeTruthy();
    expect(screen.getAllByTestId('live-bar').length).toBeGreaterThan(0);
    expect(
      screen.getByText('The pale green shape is the native speaker. Try to fill it.'),
    ).toBeTruthy();
    const tip = screen.getByText(
      (_, el) => el?.textContent === 'mitigate /ˈmɪt.ɪ.ɡeɪt/: push on MIT' && el.tagName === 'SPAN',
    );
    expect([...tip.querySelectorAll('b')].map((b) => b.textContent)).toEqual([
      'mitigate',
      'mɪt',
      'MIT',
    ]);
    expect(screen.getByText('or just pause, it stops by itself')).toBeTruthy();
  });

  it('countdown: the number over the native shape, tap to start now, mic waiting', () => {
    const p = recording({ countdown: 2, elapsedMs: 0 });
    const count = screen.getByRole('button', {
      name: 'Get ready. Recording starts after the beep. Tap to start now',
    });
    expect(within(count).getByText('2')).toBeTruthy();
    expect(within(count).getByText('Get ready')).toBeTruthy();
    expect(screen.getByText('Recording starts after the beep · tap to start now')).toBeTruthy();
    expect(screen.getByText('Starting soon')).toBeTruthy();
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Stop recording' })).toBeNull();
    fireEvent.click(count);
    expect(p.onSkipCountdown).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    const sentence = screen.getByText('Planting', { exact: false }).closest('p')!;
    expect(sentence.querySelector('[data-faded]')).toBeNull();
  });

  it('follows along: words not reached yet are faded', () => {
    const t = SPEAK_FIXTURE_ITEM.timings_us!;
    recording({ elapsedMs: t.words[2].start * 1.5 * 1000 + 10 }); // 1.5× slower (G3-b)
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
    accent: 'UK',
    envelopes: SPEAK_FIXTURE_RESULT.envelopes,
    userDurationMs: 3400,
    status: 'done',
    result: SPEAK_FIXTURE_RESULT,
    initial: 'M',
    view: 'overlay',
    onView: vi.fn(),
    playing: null,
    onPlayNative: vi.fn(),
    onPlayYou: vi.fn(),
    onCheckAgain: vi.fn(),
    onRecordAgain: vi.fn(),
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
    expect(screen.getByText('MIT is too soft')).toBeTruthy();
    expect(screen.getByText('In bloom · 82% match')).toBeTruthy();
    expect(screen.getByText('Fruit at 90%').tagName).toBe('B');
    const title = screen.getByText(
      (_, el) => el?.textContent === 'In mitigate, make MIT stronger' && el.tagName === 'SPAN',
    );
    expect(title.querySelectorAll('b')).toHaveLength(2);
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent ===
            'You said its three parts evenly. Say MIT-i-gate. The rest of the sentence flowed well.' &&
          el.tagName === 'SPAN',
      ),
    ).toBeTruthy();
    expect(screen.getAllByTestId('wave-target')).toHaveLength(1);
  });

  it('done, like the canvas: missing struck through, heard "affects", bands, "Also keep…"', () => {
    compare({ result: SPEAK_FIXTURE_RESULT_CANVAS });
    expect(screen.getByText('In bloom · 76% match')).toBeTruthy();
    expect(screen.getByText('missing')).toBeTruthy();
    const struck = screen.getAllByText('the').find((el) => el.className.includes('line-through'));
    expect(struck).toBeTruthy();
    expect(screen.getByText('heard “affects”')).toBeTruthy();
    expect(screen.getAllByTestId('wave-target')).toHaveLength(1);
    expect(screen.getAllByTestId('wave-band')).toHaveLength(2);
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent ===
            'You said its three parts evenly. Say MIT-i-gate. Also keep the, and say effects /ɪˈfekts/.' &&
          el.tagName === 'SPAN',
      ),
    ).toBeTruthy();
  });

  it('switches view, plays native / you, tries again and goes next', () => {
    const p = compare();
    fireEvent.click(screen.getByRole('radio', { name: 'Side by side' }));
    expect(p.onView).toHaveBeenCalledWith('stacked');
    expect(screen.getByText('Native · UK')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play the native speaker' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play your recording' }));
    expect(p.onPlayNative).toHaveBeenCalled();
    expect(p.onPlayYou).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next word' }));
    expect(p.onTryAgain).toHaveBeenCalled();
    expect(p.onNext).toHaveBeenCalled();
  });

  it('checking: waveforms and play at once, plain sentence, shimmer card, privacy line', () => {
    const p = compare({ status: 'checking', result: null });
    expect(screen.getByRole('img', { name: /in clay over the native/ })).toBeTruthy();
    expect(screen.getByText(/3\.4s · native/)).toBeTruthy();
    expect(within(screen.getByRole('status')).getByText('Checking your sentence…')).toBeTruthy();
    expect(screen.getByText('Your recording is checked, then deleted.')).toBeTruthy();
    expect(screen.getByText(SPEAK_FIXTURE_ITEM.sentence)).toBeTruthy();
    expect(screen.queryByTestId('wave-target')).toBeNull();
    expect(screen.queryByText(/% match/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play your recording' }));
    expect(p.onPlayYou).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next word' }));
    expect(p.onNext).toHaveBeenCalled();
  });

  it("failed: Couldn't check this one, Check again / Record again", () => {
    const p = compare({ status: 'failed', result: null });
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText("Couldn't check this one")).toBeTruthy();
    expect(
      within(alert).getByText("The connection dropped. Your recording wasn't saved."),
    ).toBeTruthy();
    fireEvent.click(within(alert).getByRole('button', { name: 'Check again' }));
    fireEvent.click(within(alert).getByRole('button', { name: 'Record again' }));
    expect(p.onCheckAgain).toHaveBeenCalled();
    expect(p.onRecordAgain).toHaveBeenCalled();
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
    expect(screen.getByText('TER', { selector: 'b' })).toBeTruthy(); // spelling, like the canvas
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
