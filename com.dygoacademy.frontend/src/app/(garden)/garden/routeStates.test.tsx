import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../../messages/en-US.json';
import vi_messages from '../../../../messages/vi-VN.json';
import zh from '../../../../messages/zh-CN.json';

import GardenError from './error';
import GardenLoading from './loading';
import GardenNotFound from './not-found';

/** UI-3 U3-1: loading, error and not-found for /garden, in every language. */
const LOCALES = [
  ['en-US', en],
  ['vi-VN', vi_messages],
  ['zh-CN', zh],
] as const;

function renderIn(locale: string, messages: typeof en, ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe.each(LOCALES)('garden route states (%s)', (locale, messages) => {
  const live = messages.screens.live;

  it('loading: a busy skeleton in the screen column', () => {
    renderIn(locale, messages, <GardenLoading />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain(live.loading);
    expect(status.className).toContain('max-w-[560px]');
  });

  it('error: friendly message, retry calls reset, link home', () => {
    const reset = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderIn(locale, messages, <GardenError error={new Error('boom')} reset={reset} />);
    expect(screen.getByRole('heading', { name: live.errorTitle })).toBeTruthy();
    expect(screen.getByText(live.error)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: live.retry }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: live.backHome }).getAttribute('href')).toBe('/garden');
    spy.mockRestore();
  });

  it('not found: title, body and a way home', () => {
    renderIn(locale, messages, <GardenNotFound />);
    expect(screen.getByText(live.notFoundTitle)).toBeTruthy();
    expect(screen.getByText(live.notFoundBody)).toBeTruthy();
    expect(screen.getByRole('link', { name: live.backHome }).getAttribute('href')).toBe('/garden');
  });
});
