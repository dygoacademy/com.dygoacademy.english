import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';
import { isVoiceDonationOn, VOICE_DONATION_LINKS } from '@/lib/voice-donation';

import { formatSince, PrivacyScreen, type PrivacyScreenProps } from './PrivacyScreen';

function renderScreen(props: Partial<PrivacyScreenProps> = {}) {
  const handlers = {
    onRegionChange: vi.fn(),
    onSwitch: vi.fn(),
    onConfirm: vi.fn(),
    onDismiss: vi.fn(),
    onAskDelete: vi.fn(),
    onDelete: vi.fn(),
  };
  renderWithIntl(
    <div data-ui="garden">
      <PrivacyScreen
        backHref="/me"
        status={{ donating: false, count: 0, since: null }}
        overlay={null}
        region={null}
        links={VOICE_DONATION_LINKS}
        framed
        {...handlers}
        {...props}
      />
    </div>,
  );
  return handlers;
}

describe('isVoiceDonationOn', () => {
  it('is on only for the literal "true"', () => {
    expect(isVoiceDonationOn('true')).toBe(true);
    expect(isVoiceDonationOn(undefined)).toBe(false);
    expect(isVoiceDonationOn('1')).toBe(false);
    expect(isVoiceDonationOn('false')).toBe(false);
  });
});

describe('PrivacyScreen (A8e)', () => {
  it('off: the switch is off, says recordings are deleted, no delete button', () => {
    const { onSwitch } = renderScreen();
    const toggle = screen.getByRole('switch', { name: 'Voice donation' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Off · recordings are deleted after each check')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete my donated recordings' })).toBeNull();
    fireEvent.click(toggle);
    expect(onSwitch).toHaveBeenCalledWith(true);
    expect(screen.getByRole('link', { name: 'How we use donated recordings' }).getAttribute('href')).toBe(
      '/privacy#p4',
    );
  });

  it('on: count and date, the promises, and delete asks first', () => {
    const { onAskDelete } = renderScreen({
      status: { donating: true, count: 38, since: new Date('2026-10-12T09:00:00Z') },
    });
    expect(screen.getByText('38').closest('p')?.textContent).toBe('38 recordings donated · since 12 Oct 2026');
    expect(screen.getByText('Stored under a random code, not your name')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete my donated recordings' }));
    expect(onAskDelete).toHaveBeenCalled();
  });

  it('confirm sheet: four lines, an optional region and two equal answers', () => {
    const { onRegionChange, onConfirm, onDismiss } = renderScreen({ overlay: 'confirm', region: 'south' });
    const sheet = screen.getByRole('dialog', { name: 'Donate your voice recordings?' });
    expect(sheet.querySelectorAll('li')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'South' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Prefer not to say' }));
    expect(onRegionChange).toHaveBeenCalledWith('none');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, donate' }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('delete dialog names the count and deletes on confirm', () => {
    const { onDelete } = renderScreen({
      status: { donating: true, count: 38, since: new Date('2026-10-12T09:00:00Z') },
      overlay: 'delete',
    });
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toContain('38');
    fireEvent.click(dialog.querySelector('button')!);
    expect(onDelete).toHaveBeenCalled();
  });

  it('formats the date per language', () => {
    const day = new Date('2026-10-12T09:00:00Z');
    expect(formatSince(day, 'en-US', 'UTC')).toBe('12 Oct 2026');
    expect(formatSince(day, 'vi-VN', 'UTC')).toBe('12/10/2026');
    expect(formatSince(day, 'zh-CN', 'UTC')).toBe('2026年10月12日');
  });
});
