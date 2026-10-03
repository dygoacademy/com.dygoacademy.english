import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { PAIN_KEYS, PainCards, type PainCardsProps } from './PainCards';

function renderCards(props: PainCardsProps = {}) {
  return renderWithIntl(
    <div data-ui="garden">
      <PainCards {...props} />
    </div>,
  );
}

const FRONT = {
  use: '“I know what it means, but I can’t use it.”',
  forget: '“I learn a word today and forget it by next week.”',
};
const FORGET_BACK = 'Dygo brings each word back right before you’d forget it.';

const pressed = () =>
  screen.getAllByRole('button').map((button) => button.getAttribute('aria-pressed'));

describe('PainCards (Home page v2 Sound familiar?, HP-7)', () => {
  it('shows four unflipped cards in the canvas order', () => {
    const { container } = renderCards();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(pressed()).toEqual(['false', 'false', 'false', 'false']);
    expect([...container.querySelectorAll('[data-pain]')].map((el) => el.getAttribute('data-pain'))).toEqual([
      ...PAIN_KEYS,
    ]);
  });

  it('a click flips that card only, and a second click flips it back', () => {
    renderCards();
    const card = screen.getByRole('button', { name: new RegExp(FRONT.forget) });
    fireEvent.click(card);
    expect(pressed()).toEqual(['false', 'true', 'false', 'false']);
    fireEvent.click(card);
    expect(pressed()).toEqual(['false', 'false', 'false', 'false']);
  });

  it.each(['Enter', ' '])('the %j key flips one card once', (key) => {
    renderCards();
    const card = screen.getByRole('button', { name: new RegExp(FRONT.use) });
    fireEvent.keyDown(card, { key });
    fireEvent.keyUp(card, { key });
    expect(pressed()).toEqual(['true', 'false', 'false', 'false']);
    // Holding the key down doesn't flip it again and again.
    fireEvent.keyDown(card, { key, repeat: true });
    expect(pressed()).toEqual(['true', 'false', 'false', 'false']);
  });

  it('lays the turned-away face over the card so only the face shown sets its height (HP-11)', () => {
    const { container } = renderCards();
    const card = container.querySelector('[data-pain="use"]') as HTMLElement;
    const front = card.querySelector('[data-face="front"]') as HTMLElement;
    const back = card.querySelector('[data-face="back"]') as HTMLElement;
    expect(back.className).toContain('absolute');
    expect(front.className).not.toContain('absolute');
    fireEvent.click(card);
    expect(front.className).toContain('absolute');
    expect(back.className).not.toContain('absolute');
  });

  it('keeps both faces in the DOM but hides the turned-away face from the accessibility tree', () => {
    const { container } = renderCards();
    const card = container.querySelector('[data-pain="forget"]') as HTMLElement;
    const front = card.querySelector('[data-face="front"]') as HTMLElement;
    const back = card.querySelector('[data-face="back"]') as HTMLElement;
    expect(back.textContent).toContain(FORGET_BACK);
    expect(back.getAttribute('aria-hidden')).toBe('true');
    expect(front.hasAttribute('aria-hidden')).toBe(false);
    expect(screen.queryByRole('button', { name: new RegExp(FORGET_BACK) })).toBeNull();

    fireEvent.click(card);
    expect(front.getAttribute('aria-hidden')).toBe('true');
    expect(back.hasAttribute('aria-hidden')).toBe(false);
    expect(screen.getByRole('button', { name: new RegExp(FORGET_BACK) }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: new RegExp(FRONT.forget) })).toBeNull();
  });

  it('can start with a card flipped (the H3s-pain-flipped fixture)', () => {
    renderCards({ initialFlipped: ['forget'] });
    expect(pressed()).toEqual(['false', 'true', 'false', 'false']);
    expect(screen.getAllByText('How Dygo helps')).toHaveLength(4);
  });
});
