import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { HomeScreen, type HomeScreenProps } from './HomeScreen';

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

const hrefs = (name: string | RegExp) =>
  screen.getAllByRole('link', { name }).map((link) => link.getAttribute('href'));

describe('HomeScreen (Home page H1 / H2)', () => {
  it('shows the hero headline and every section heading', () => {
    renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: 'Grow your English, one word at a time.' })).toBeTruthy();
    for (const name of [
      'How your words grow',
      'Everything a growing vocabulary needs',
      'A garden for kids, too',
      'Plant your first seed today',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy();
    }
  });

  it('sends every sign-up button to /register and both sign-in links to /login', () => {
    renderScreen();
    expect(hrefs('Start growing, it’s free')).toEqual(['/register']);
    // Header (desktop) and the final call to action.
    expect(hrefs('Create account')).toEqual(['/register', '/register']);
    expect(hrefs('Sign in')).toEqual(['/login']);
    expect(hrefs('I have an account')).toEqual(['/login']);
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
    expect(screen.getByText('Coming soon')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Dygo' })).toBeTruthy();
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
