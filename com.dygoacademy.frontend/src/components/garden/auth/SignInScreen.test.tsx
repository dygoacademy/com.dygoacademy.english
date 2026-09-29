import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { safeNextPath } from './authPaths';
import { SignInScreen, type SignInScreenProps } from './SignInScreen';

function renderScreen(props: Partial<SignInScreenProps> = {}) {
  const onSubmit = vi.fn();
  const onLanguageChange = vi.fn();
  renderWithIntl(
    <div data-ui="garden">
      <SignInScreen
        locale="en-US"
        onLanguageChange={onLanguageChange}
        onSubmit={onSubmit}
        forgotHref="/forgot-password"
        registerHref="/register"
        {...props}
      />
    </div>,
  );
  return { onSubmit, onLanguageChange };
}

describe('SignInScreen (AU1)', () => {
  it('shows the garden sign-in with no error banner', () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('link', { name: 'Forgot password?' }).getAttribute('href')).toBe('/forgot-password');
    expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('href')).toBe('/register');
  });

  it('shows one error that never says which field was wrong', () => {
    renderScreen({ error: 'mismatch' });
    expect(screen.getByRole('alert').textContent).toBe(
      "That email and password don't match. Try again or reset your password.",
    );
  });

  it('sets autocomplete and toggles the password with Show / Hide', () => {
    renderScreen();
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe('current-password');
    expect((screen.getByLabelText('Email') as HTMLInputElement).autocomplete).toBe('email');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password.type).toBe('password');
  });

  it('submits the typed email and password', () => {
    const { onSubmit } = renderScreen({ initialEmail: 'minh@example.com' });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'minh@example.com', password: 'secret123' });
  });

  it('changes the language from the chip', () => {
    const { onLanguageChange } = renderScreen();
    fireEvent.change(screen.getByRole('combobox', { name: 'App language' }), {
      target: { value: 'vi-VN' },
    });
    expect(onLanguageChange).toHaveBeenCalledWith('vi-VN');
  });
});

describe('safeNextPath', () => {
  it('keeps same-site paths and drops everything else', () => {
    expect(safeNextPath('/join/abc')).toBe('/join/abc');
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
  });
});
