import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import en from '../../../../messages/en-US.json';
import { renderWithIntl } from '@/test/render';

import { LiveLoading } from './LiveState';

afterEach(cleanup);

describe('LiveLoading', () => {
  it('is the garden loader (a busy status with the loading text)', () => {
    renderWithIntl(<LiveLoading />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain(en.screens.live.loading);
  });
});
