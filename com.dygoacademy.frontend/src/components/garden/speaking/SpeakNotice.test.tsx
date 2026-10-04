import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SPEAK_NOTICES } from '@/lib/speaking/constants';
import { renderWithIntl } from '@/test/render';

import { noticeKeepsMic, SpeakNotice } from './SpeakNotice';

describe('SpeakNotice (T7 states)', () => {
  it.each(SPEAK_NOTICES)('%s renders a title and its lines', (kind) => {
    const { container } = renderWithIntl(
      <SpeakNotice kind={kind} onPrimary={vi.fn()} onSecondary={vi.fn()} />,
    );
    const box = container.querySelector(`[data-notice="${kind}"]`)!;
    expect(box.getAttribute('role')).toBe(kind === 'mic' ? 'dialog' : 'alert');
    expect(box.querySelectorAll('span').length).toBeGreaterThanOrEqual(2);
  });

  it('mic explainer: why, privacy, headphones, Allow / Not now', () => {
    const allow = vi.fn();
    const later = vi.fn();
    renderWithIntl(<SpeakNotice kind="mic" onPrimary={allow} onSecondary={later} />);
    expect(screen.getByText(/We don't save your recordings/)).toBeTruthy();
    expect(screen.getByText(/headphones help/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Allow microphone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(allow).toHaveBeenCalled();
    expect(later).toHaveBeenCalled();
  });

  it('quiet / short / unsupported have no buttons; only quiet and short keep the mic', () => {
    renderWithIntl(<SpeakNotice kind="unsupported" onPrimary={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(SPEAK_NOTICES.filter(noticeKeepsMic)).toEqual(['quiet', 'short']);
  });
});
