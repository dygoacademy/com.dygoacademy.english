import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { ForgotPasswordScreen, type ForgotPasswordScreenProps } from './ForgotPasswordScreen';
import { ResetPasswordScreen, type ResetPasswordScreenProps } from './ResetPasswordScreen';

function renderForgot(props: Partial<ForgotPasswordScreenProps> = {}) {
  const onSubmit = vi.fn();
  const onResend = vi.fn();
  renderWithIntl(
    <div data-ui="garden">
      <ForgotPasswordScreen
        locale="en-US"
        onLanguageChange={() => {}}
        onSubmit={onSubmit}
        onResend={onResend}
        backHref="/login"
        signInHref="/login"
        {...props}
      />
    </div>,
  );
  return { onSubmit, onResend };
}

function renderReset(props: Partial<ResetPasswordScreenProps> = {}) {
  const onSubmit = vi.fn();
  renderWithIntl(
    <div data-ui="garden">
      <ResetPasswordScreen
        locale="en-US"
        onLanguageChange={() => {}}
        onSubmit={onSubmit}
        stage="ready"
        backHref="/login"
        forgotHref="/forgot-password"
        {...props}
      />
    </div>,
  );
  return { onSubmit };
}

describe('ForgotPasswordScreen (AU4)', () => {
  it('asks for the email and sends the trimmed address', () => {
    const { onSubmit } = renderForgot();
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/login');
    const email = screen.getByLabelText('Email address');
    expect(email.getAttribute('autocomplete')).toBe('email');
    fireEvent.change(email, { target: { value: ' minh@example.com ' } });
    fireEvent.submit(email.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('minh@example.com');
    expect(screen.queryByText('Check your inbox 📩')).toBeNull();
  });

  it('shows "Check your inbox" with the address, back to sign in and send again', () => {
    const { onResend } = renderForgot({ sentTo: 'minh@example.com' });
    expect(screen.getByText('Check your inbox 📩')).toBeTruthy();
    expect(screen.getByText('We sent a reset link to minh@example.com. It works for 1 hour.')).toBeTruthy();
    expect(screen.queryByLabelText('Email address')).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to sign in' }).getAttribute('href')).toBe('/login');
    fireEvent.click(screen.getByRole('button', { name: "Didn't get the email? Resend link" }));
    expect(onResend).toHaveBeenCalled();
  });

  it('shows the rate-limit error', () => {
    renderForgot({ error: 'rateLimited' });
    expect(screen.getByRole('alert').textContent).toBe('Too many tries. Wait a minute, then try again.');
  });
});

describe('ResetPasswordScreen (AU4 set a new password)', () => {
  it('takes a new password (min 6, new-password) and submits it', () => {
    const { onSubmit } = renderReset();
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeTruthy();
    const input = screen.getByLabelText('New password');
    expect(input.getAttribute('autocomplete')).toBe('new-password');
    expect(input.getAttribute('minlength')).toBe('6');
    fireEvent.change(input, { target: { value: 'newgarden' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('newgarden');
  });

  it('keeps the button off while the link is being checked', () => {
    renderReset({ stage: 'checking' });
    expect((screen.getByRole('button', { name: 'Save new password' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers a new link when the link has expired', () => {
    renderReset({ stage: 'expired' });
    expect(screen.getByRole('heading', { name: 'This link has expired' })).toBeTruthy();
    expect(screen.queryByLabelText('New password')).toBeNull();
    expect(screen.getByRole('link', { name: 'Send new link' }).getAttribute('href')).toBe('/forgot-password');
  });
});
