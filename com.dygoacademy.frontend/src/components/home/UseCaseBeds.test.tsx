import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AppLocale } from '@/i18n/config';
import { renderWithIntl } from '@/test/render';

import { UseCaseBeds, type UseCaseBedsProps } from './UseCaseBeds';

/** The copy is the English messages (test/render); `locale` only picks the meaning line. */
function renderBeds(props: Partial<UseCaseBedsProps> = {}, locale: AppLocale = 'en-US') {
  return renderWithIntl(
    <div data-ui="garden">
      <UseCaseBeds locale={locale} registerHref="/register" {...props} />
    </div>,
  );
}

const selectedTab = () => screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true');
const panel = () => screen.getByRole('tabpanel');

describe('UseCaseBeds (Home page v2 What do you need English for?, HP-8)', () => {
  it('shows five tabs in the canvas order with Work selected by default', () => {
    renderBeds();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Work',
      'Study & IELTS',
      'Travel',
      'Daily life',
      'My own words',
    ]);
    expect(selectedTab()?.textContent).toBe('Work');
    expect(panel().getAttribute('aria-labelledby')).toBe(selectedTab()?.id);
    for (const word of ['deadline', 'negotiate', 'schedule', 'colleague', 'feedback']) {
      expect(within(panel()).getByText(word)).toBeTruthy();
    }
    // Only the selected tab is in the tab order.
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1, -1]);
  });

  it('arrow keys, Home and End move the selection and the focus (wrapping round)', () => {
    renderBeds();
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Work' }), { key: 'ArrowRight' });
    expect(selectedTab()?.textContent).toBe('Study & IELTS');
    expect(document.activeElement).toBe(selectedTab());
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(selectedTab()?.textContent).toBe('Travel');
    expect(within(panel()).getByText('itinerary')).toBeTruthy();
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(selectedTab()?.textContent).toBe('My own words');
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(selectedTab()?.textContent).toBe('Work');
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(selectedTab()?.textContent).toBe('My own words');
    expect(document.activeElement).toBe(selectedTab());
  });

  it('a click selects a bed', () => {
    renderBeds();
    fireEvent.click(screen.getByRole('tab', { name: 'Daily life' }));
    expect(selectedTab()?.textContent).toBe('Daily life');
    expect(within(panel()).getByText('grocery')).toBeTruthy();
  });

  it('shows Coming soon and the "start with your own words" line on unseeded beds only', () => {
    renderBeds();
    const expectations: [string, boolean, string][] = [
      ['Work', true, 'Words for emails, meetings and talking to customers. In the meantime, start with your own words.'],
      ['Study & IELTS', false, 'The IELTS Academic word list is ready to go.'],
      ['Travel', true, 'Words that help you find your way on your next trip. In the meantime, start with your own words.'],
      [
        'Daily life',
        true,
        'Everyday words for shopping, appointments and getting things done. In the meantime, start with your own words.',
      ],
      ['My own words', false, 'Save any word you come across, with your own meaning and example sentence.'],
    ];
    for (const [name, soon, line] of expectations) {
      fireEvent.click(screen.getByRole('tab', { name }));
      expect(within(panel()).queryByText('Coming soon') !== null).toBe(soon);
      expect(within(panel()).getByText(line)).toBeTruthy();
      expect(within(panel()).getByRole('link', { name: 'Start with these words' }).getAttribute('href')).toBe(
        '/register',
      );
    }
  });

  it('"My own words" shows five empty seed tiles, and the AI line only when AI fill-in is live', () => {
    const { container, unmount } = renderBeds({ initialBed: 'own' });
    expect(container.querySelectorAll('[data-empty-tile]')).toHaveLength(5);
    expect(within(panel()).getAllByText('Add a word')).toHaveLength(5);
    unmount();
    renderBeds({ initialBed: 'own', aiFill: true });
    expect(within(panel()).getByText('Add any word you meet. Dygo adds the meaning and examples.')).toBeTruthy();
  });

  it('hides the meaning line in en-US and shows it in the page language otherwise', () => {
    const en = renderBeds({ initialBed: 'travel' });
    expect(en.container.querySelectorAll('[data-meaning]')).toHaveLength(0);
    en.unmount();

    const vi = renderBeds({ initialBed: 'travel' }, 'vi-VN');
    expect(vi.container.querySelectorAll('[data-meaning]')).toHaveLength(5);
    expect(within(panel()).getByText('lịch trình')).toBeTruthy();
    vi.unmount();

    renderBeds({ initialBed: 'work' }, 'zh-CN');
    expect(within(panel()).getByText('截止日期')).toBeTruthy();
  });
});
