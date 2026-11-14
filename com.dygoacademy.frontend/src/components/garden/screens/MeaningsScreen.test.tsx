import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { ReviewCard } from '../ReviewCard';
import { MeaningsScreen, type MeaningsScreenProps } from './MeaningsScreen';

function renderScreen(props: Partial<MeaningsScreenProps> = {}) {
  const handlers = { onMeaning: vi.fn(), onRecallFirst: vi.fn(), onSave: vi.fn() };
  renderWithIntl(
    <div data-ui="garden">
      <MeaningsScreen framed backHref="/me" meaning="none" recallFirst {...handlers} {...props} />
    </div>,
  );
  return handlers;
}

describe('MeaningsScreen (A8d)', () => {
  it('English only: three choices, all selectable, no Recall first', () => {
    const h = renderScreen();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios.every((r) => !(r as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.queryByRole('switch', { name: 'Recall first' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /中文/ }));
    expect(h.onMeaning).toHaveBeenCalledWith('zh-CN');
  });

  it('Vietnamese with Recall first: the preview hides the translation', () => {
    renderScreen({ meaning: 'vi-VN' });
    expect(screen.getByRole('switch', { name: 'Recall first' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Vietnamese shows after you answer')).toBeTruthy();
    expect(screen.queryByText('giảm nhẹ, làm dịu bớt')).toBeNull();
  });

  it('Recall first off: the preview shows the translation first', () => {
    const h = renderScreen({ meaning: 'zh-CN', recallFirst: false });
    expect(screen.getByText('减轻，缓和').getAttribute('lang')).toBe('zh-Hans');
    fireEvent.click(screen.getByRole('switch', { name: 'Recall first' }));
    expect(h.onRecallFirst).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(h.onSave).toHaveBeenCalled();
  });
});

describe('ReviewCard Recall first (A8d)', () => {
  const card = {
    word: 'mitigate',
    revealed: true,
    meaning: 'to make something bad less harmful or serious',
    meaningTranslation: { text: 'giảm nhẹ', lang: 'vi' },
    meaningFirst: true,
  };

  it('hides the translation until the chip is tapped', () => {
    renderWithIntl(<ReviewCard {...card} recallFirst />);
    expect(screen.queryByText('giảm nhẹ')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show Vietnamese' }));
    expect(screen.getByText('giảm nhẹ')).toBeTruthy();
  });

  it('shows it at once with Recall first off', () => {
    renderWithIntl(<ReviewCard {...card} />);
    expect(screen.getByText('giảm nhẹ')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show Vietnamese' })).toBeNull();
  });
});
