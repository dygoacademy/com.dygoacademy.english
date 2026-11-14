import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { LanguageScreen, type LanguageScreenProps } from './LanguageScreen';
import { MeScreen } from './MeScreen';
import { ME } from './fixtures';

function renderScreen(props: Partial<LanguageScreenProps> = {}) {
  const handlers = { onAppLocale: vi.fn(), onVariety: vi.fn(), onSave: vi.fn() };
  renderWithIntl(
    <div data-ui="garden">
      <LanguageScreen
        framed
        backHref="/me"
        appLocale="en-US"
        variety="en-US"
        {...handlers}
        {...props}
      />
    </div>,
  );
  return handlers;
}

describe('LanguageScreen (A8f)', () => {
  it('names each app language in itself and picks one', () => {
    const h = renderScreen();
    const app = screen.getByRole('radiogroup', { name: 'App language' });
    const radios = Array.from(app.querySelectorAll('[role=radio]'));
    expect(radios.map((r) => r.textContent)).toEqual(['English', 'Tiếng Việt', '中文（简体）']);
    expect(radios.map((r) => r.getAttribute('lang'))).toEqual(['en', 'vi', 'zh-Hans']);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Tiếng Việt' }));
    expect(h.onAppLocale).toHaveBeenCalledWith('vi-VN');
  });

  it('picks UK English and saves', () => {
    const h = renderScreen({ appLocale: 'vi-VN', variety: 'en-GB' });
    expect(screen.getByRole('radio', { name: 'Tiếng Việt' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByRole('radio', { name: 'UK English' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'US English' }));
    expect(h.onVariety).toHaveBeenCalledWith('en-US');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(h.onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/me');
  });

  it('shows the error and locks the choices while saving', () => {
    renderScreen({ saving: true, error: true });
    expect(screen.getByText(/Couldn't save/)).toBeTruthy();
    expect(screen.getAllByRole('radio').every((r) => (r as HTMLButtonElement).disabled)).toBe(true);
  });
});

describe('MeScreen: the A8f row', () => {
  it('shows app language · accent and links to /me/language; the goal names its pot', () => {
    renderWithIntl(
      <div data-ui="garden">
        <MeScreen
          {...ME}
          dailyGoal={{ missions: 3, minutes: 10, href: '/me/goal' }}
          reminder={null}
          family={null}
          stickyNav={false}
          language={{ appLocale: 'vi-VN', variety: 'en-GB', href: '/me/language' }}
        />
      </div>,
    );
    const row = screen.getByRole('link', { name: /Language & accent/ });
    expect(row.getAttribute('href')).toBe('/me/language');
    expect(row.textContent).toContain('Tiếng Việt · UK');
    expect(screen.getByRole('link', { name: /Daily goal/ }).textContent).toContain(
      'Steady · 10 min',
    );
  });
});
