import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { ReviewCard } from './ReviewCard';

const BASE = {
  word: 'sustainable',
  ipa: '/səˈsteɪnəbl/',
  audioSrc: null,
  level: 'B2',
  topic: 'Environment',
  partOfSpeech: 'adjective',
  meaning: 'able to continue for a long time',
  meaningTranslation: { text: 'bền vững', lang: 'vi' },
  example: 'A more sustainable city.',
  collocations: ['sustainable growth'],
};

describe('ReviewCard', () => {
  it('hides the answer from the DOM until revealed', () => {
    renderWithIntl(<ReviewCard {...BASE} revealed={false} />);
    expect(screen.getByText('sustainable')).toBeTruthy();
    expect(screen.queryByText(BASE.meaning)).toBeNull();
    expect(screen.queryByText('bền vững')).toBeNull();
  });

  it('shows meaning, translation (with its lang), example and collocations when revealed', () => {
    renderWithIntl(<ReviewCard {...BASE} revealed />);
    expect(screen.getByText(BASE.meaning).getAttribute('lang')).toBe('en');
    expect(screen.getByText('bền vững').getAttribute('lang')).toBe('vi');
    expect(screen.getByText('sustainable growth')).toBeTruthy();
    // The canvas shows the example in curly quotes, without bolding the word.
    expect(screen.getByText('“A more sustainable city.”').getAttribute('lang')).toBe('en');
  });

  it('shows the canvas hint while the answer is hidden', () => {
    const { container } = renderWithIntl(<ReviewCard {...BASE} revealed={false} />);
    expect(container.textContent).toContain('Say the meaning out loud,then check.');
    expect(container.querySelector('br')).not.toBeNull();
  });

  it('keeps word → IPA → meaning in reading order', () => {
    const { container } = renderWithIntl(<ReviewCard {...BASE} revealed />);
    const text = container.textContent ?? '';
    expect(text.indexOf('/səˈsteɪnəbl/')).toBeGreaterThan(text.indexOf('B2'));
    expect(text.indexOf(BASE.meaning)).toBeGreaterThan(text.indexOf('/səˈsteɪnəbl/'));
  });

  it('shows a disabled "no audio" button when there is no clip', () => {
    renderWithIntl(<ReviewCard {...BASE} revealed={false} />);
    const button = screen.getByRole('button', {
      name: 'No audio for this word',
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
