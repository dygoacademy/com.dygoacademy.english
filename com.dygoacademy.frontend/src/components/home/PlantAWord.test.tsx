import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { PLANT_TIMINGS, PlantAWord, type PlantAWordProps } from './PlantAWord';
import { findPlantWord, PLANT_WORDS, splitExample } from './plantWords';

function renderPlant(props: Partial<PlantAWordProps> = {}) {
  return renderWithIntl(
    <div data-ui="garden">
      <PlantAWord locale="en-US" registerHref="/register" {...props} />
    </div>,
  );
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

const stateOf = (container: HTMLElement) => container.querySelector('[data-plant-state]')?.getAttribute('data-plant-state');

function finishGrowing() {
  act(() => vi.advanceTimersByTime(PLANT_TIMINGS.planting));
  act(() => vi.advanceTimersByTime(PLANT_TIMINGS.sprouting));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PlantAWord (Home page v2 hero, HP-6)', () => {
  it('starts idle with the input, the Plant button and the four chips', () => {
    const { container } = renderPlant();
    expect(stateOf(container)).toBe('idle');
    expect(screen.getByRole('textbox', { name: 'Plant a word' }).getAttribute('enterkeyhint')).toBe('go');
    expect(screen.getByRole('button', { name: 'Plant' })).toBeTruthy();
    const chips = ['confident', 'deadline', 'mitigate', 'souvenir'];
    for (const chip of chips) {
      expect(screen.getByRole('button', { name: chip }).getAttribute('aria-pressed')).toBe('false');
    }
    expect(screen.queryByTestId('plant-card')).toBeNull();
  });

  it('a chip goes planting → sprouting → bloomed and opens the card with the en-US definition only', () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    const { container } = renderPlant();
    fireEvent.click(screen.getByRole('button', { name: 'deadline' }));
    expect(stateOf(container)).toBe('planting');
    act(() => vi.advanceTimersByTime(PLANT_TIMINGS.planting));
    expect(stateOf(container)).toBe('sprouting');
    act(() => vi.advanceTimersByTime(PLANT_TIMINGS.sprouting));
    expect(stateOf(container)).toBe('bloomed');

    const card = screen.getByTestId('plant-card');
    expect(card.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('heading', { level: 3, name: 'deadline' })).toBe(document.activeElement);
    expect(screen.getByText('the time or date by which something must be done')).toBeTruthy();
    expect(screen.queryByText('hạn chót')).toBeNull();
    expect(screen.getByText('noun')).toBeTruthy();
    expect(screen.getByText('due date')).toBeTruthy();
    expect(screen.getByText('I’ll bring this one back before it slips away. Want to keep it?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'deadline' }).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('deadline');
  });

  it('shows the meaning in the page language (vi-VN, zh-CN) above the English definition', () => {
    setReducedMotion(true);
    const vi_ = renderPlant({ locale: 'vi-VN' });
    fireEvent.click(screen.getByRole('button', { name: 'souvenir' }));
    expect(screen.getByText('quà lưu niệm')).toBeTruthy();
    expect(screen.getByText('something you buy or keep to remember a place or trip')).toBeTruthy();
    vi_.unmount();
    renderPlant({ locale: 'zh-CN' });
    fireEvent.click(screen.getByRole('button', { name: 'mitigate' }));
    expect(screen.getByText('减轻')).toBeTruthy();
  });

  it('matches a typed word case-insensitively and trimmed', () => {
    setReducedMotion(true);
    renderPlant();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  NeGoTiate ' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form') as HTMLFormElement);
    expect(screen.getByRole('heading', { level: 3, name: 'negotiate' })).toBeTruthy();
    expect(screen.getByText('to discuss something to reach an agreement')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Save this word for free' }).getAttribute('href')).toBe(
      '/register?seed=negotiate',
    );
  });

  it('any other word gets the plant.unknown card with the same save button', () => {
    setReducedMotion(true);
    renderPlant();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'serendipity' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant' }));
    expect(screen.getByRole('heading', { level: 3, name: 'serendipity' })).toBe(document.activeElement);
    expect(screen.getByText('Sign up and we’ll start growing “serendipity” for you.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Save this word for free' }).getAttribute('href')).toBe(
      '/register?seed=serendipity',
    );
  });

  it('ignores an empty word', () => {
    const { container } = renderPlant();
    fireEvent.click(screen.getByRole('button', { name: 'Plant' }));
    expect(stateOf(container)).toBe('idle');
  });

  it('reduced motion skips planting and sprouting and blooms at once', () => {
    vi.useFakeTimers();
    setReducedMotion(true);
    const { container } = renderPlant();
    fireEvent.click(screen.getByRole('button', { name: 'confident' }));
    expect(stateOf(container)).toBe('bloomed');
    expect(screen.getByTestId('plant-card')).toBeTruthy();
  });

  it('a second word replaces the card and starts again from planting', () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    const { container } = renderPlant();
    fireEvent.click(screen.getByRole('button', { name: 'deadline' }));
    finishGrowing();
    fireEvent.click(screen.getByRole('button', { name: 'mitigate' }));
    expect(stateOf(container)).toBe('planting');
    expect(screen.queryByTestId('plant-card')).toBeNull();
    finishGrowing();
    expect(screen.getByRole('heading', { level: 3, name: 'mitigate' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 3, name: 'deadline' })).toBeNull();
  });

  it('save link carries the seed, URL-encoded', () => {
    setReducedMotion(true);
    renderPlant();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ice cream' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant' }));
    expect(screen.getByRole('link', { name: 'Save this word for free' }).getAttribute('href')).toBe(
      '/register?seed=ice%20cream',
    );
  });

  it('initialWord starts bloomed without moving focus (reference fixture)', () => {
    const { container } = renderPlant({ initialWord: 'deadline' });
    expect(stateOf(container)).toBe('bloomed');
    expect(document.activeElement).toBe(document.body);
    expect(screen.getByRole('heading', { level: 3, name: 'deadline' })).toBeTruthy();
  });
});

describe('plantWords', () => {
  it('has 8 words with a meaning in every locale', () => {
    expect(PLANT_WORDS).toHaveLength(8);
    for (const entry of PLANT_WORDS) {
      expect(entry.definition).not.toBe('');
      expect(entry.meaning['vi-VN']).not.toBe('');
      expect(entry.meaning['zh-CN']).not.toBe('');
      expect(splitExample(entry)[1].toLowerCase().startsWith(entry.word)).toBe(true);
    }
    expect(findPlantWord(' Curious ')?.word).toBe('curious');
    expect(findPlantWord('garden')).toBeUndefined();
  });
});
