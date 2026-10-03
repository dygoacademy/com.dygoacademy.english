import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { HomeScreen, type HomeScreenProps } from './HomeScreen';
import { PLANTED_WORD_KEY } from './SeedPacketCta';

function renderScreen(props: Partial<HomeScreenProps> = {}) {
  const onLanguageChange = vi.fn();
  const view = renderWithIntl(
    <div data-ui="garden">
      <HomeScreen
        locale="en-US"
        onLanguageChange={onLanguageChange}
        registerHref="/register"
        loginHref="/login"
        {...props}
      />
    </div>,
  );
  return { onLanguageChange, ...view };
}

afterEach(() => {
  window.sessionStorage.clear();
});

const hrefs = (name: string | RegExp) =>
  screen.getAllByRole('link', { name }).map((link) => link.getAttribute('href'));

describe('HomeScreen (Home page H1 / H2)', () => {
  it('shows the hero headline and the sections in the v2 order (HP-9)', () => {
    renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: 'Learn a word. Use it right. Remember it for good.' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Sound familiar?',
      'How your words grow',
      'What do you need English for?',
      'Everything a growing vocabulary needs',
      'A garden for kids, too',
      'Common questions',
      'Plant your first word today',
    ]);
  });

  it('has no facts row any more (HP-9)', () => {
    renderScreen();
    expect(screen.queryByText('3 small missions')).toBeNull();
    expect(screen.queryByText('A few minutes')).toBeNull();
  });

  it('sends every sign-up button to /register and both sign-in links to /login', () => {
    renderScreen();
    // Hero (desktop) and the seed packet call to action.
    expect(hrefs('Create free account')).toEqual(['/register', '/register']);
    // Header (desktop).
    expect(hrefs('Create account')).toEqual(['/register']);
    expect(hrefs('Sign in')).toEqual(['/login']);
    expect(hrefs('I already have an account')).toEqual(['/login', '/login']);
  });

  it('links the header anchors to sections that exist on the page', () => {
    const { container } = renderScreen();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const anchors = within(nav)
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')]);
    expect(anchors).toEqual([
      ['Features', '#features'],
      ['How it works', '#how-it-works'],
      ['Questions', '#faq'],
      ['For parents', '#for-parents'],
    ]);
    for (const [, href] of anchors) {
      expect(container.querySelector(href as string)?.tagName).toBe('SECTION');
    }
  });

  it('shows the four stages, six features and the coming-soon badge', () => {
    renderScreen();
    for (const stage of ['Seed', 'Sprout', 'Flower', 'Fruiting']) expect(screen.getByText(stage)).toBeTruthy();
    for (const feature of [
      'Daily watering',
      'Quizzes',
      'Topic beds',
      'Missions and Golden Bloom',
      'Shared gardens',
      'Your language',
    ]) {
      expect(screen.getByText(feature)).toBeTruthy();
    }
    // For parents, and the Work bed (HP-8, selected by default, not seeded yet).
    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Dygo' })).toBeTruthy();
  });

  it('the seed packet CTA carries a word planted this visit (HP-9)', () => {
    const { unmount } = renderScreen();
    const cta = () => hrefs('Create free account')[1];
    expect(cta()).toBe('/register');
    fireEvent.click(screen.getByRole('button', { name: 'deadline' }));
    expect(cta()).toBe('/register?seed=deadline');
    expect(window.sessionStorage.getItem(PLANTED_WORD_KEY)).toBe('deadline');
    unmount();

    // Same visit, page shown again (e.g. after a language change): the word is still there.
    renderScreen();
    expect(cta()).toBe('/register?seed=deadline');
  });

  it('logo goes home; Terms and Privacy are placeholders until decision 12', () => {
    renderScreen();
    expect(hrefs('Dygo')).toEqual(['/', '/']);
    expect(hrefs('Terms')).toEqual(['#']);
    expect(hrefs('Privacy')).toEqual(['#']);
    expect(screen.getByText('© 2026 Dygo Academy')).toBeTruthy();
  });

  it('changes the language from the chip', () => {
    const { onLanguageChange } = renderScreen();
    fireEvent.change(screen.getByLabelText('App language'), { target: { value: 'vi-VN' } });
    expect(onLanguageChange).toHaveBeenCalledWith('vi-VN');
  });

  it('follows the window width by default and lets the fixtures force a layout (HP-2)', () => {
    const { container, unmount } = renderScreen();
    expect(container.querySelector('[data-home-layout]')?.getAttribute('data-home-layout')).toBe('auto');
    unmount();
    const forced = renderScreen({ layout: 'desktop' });
    expect(forced.container.querySelector('[data-home-layout]')?.getAttribute('data-home-layout')).toBe('desktop');
  });
});
