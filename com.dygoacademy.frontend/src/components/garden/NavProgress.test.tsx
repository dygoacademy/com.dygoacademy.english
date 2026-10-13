import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

vi.mock('next/navigation', () => ({ usePathname: () => '/garden' }));

const { NavProgress, SPINNER_AFTER_MS } = await import('./NavProgress');

afterEach(() => vi.useRealTimers());

function link(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement('a');
  a.href = href;
  Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v));
  document.body.appendChild(a);
  return a;
}

describe('NavProgress', () => {
  it('shows the bee screen after 2.5 s and the slow message at 10 s', () => {
    vi.useFakeTimers();
    renderWithIntl(<NavProgress />);
    fireEvent.click(link('/missions'));
    expect(screen.getByRole('status').getAttribute('data-phase')).toBeNull();
    act(() => void vi.advanceTimersByTime(2500));
    expect(screen.getByRole('status').getAttribute('data-phase')).toBe('bee');
    act(() => void vi.advanceTimersByTime(7500));
    expect(screen.getByRole('status').getAttribute('data-phase')).toBe('slow');
  });

  it('shows a busy bar at once, then a spinner, after clicking an internal link', () => {
    vi.useFakeTimers();
    renderWithIntl(<NavProgress />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(link('/missions'));
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    expect(document.querySelector('svg')).toBeNull();
    act(() => void vi.advanceTimersByTime(SPINNER_AFTER_MS));
    expect(document.querySelector('svg')).not.toBeNull();
  });

  it('ignores same-page, external, new-tab and modified clicks', () => {
    renderWithIntl(<NavProgress />);
    fireEvent.click(link(window.location.pathname));
    fireEvent.click(link('https://example.com/x'));
    fireEvent.click(link('/missions', { target: '_blank' }));
    fireEvent.click(link('/missions'), { metaKey: true });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
