import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { authHrefWithNext, inviteTokenFromNext } from './authPaths';
import { RegisterScreen, type RegisterScreenProps } from './RegisterScreen';

function renderScreen(props: Partial<RegisterScreenProps> = {}) {
  const onSubmit = vi.fn();
  renderWithIntl(
    <div data-ui="garden">
      <RegisterScreen
        locale="en-US"
        onLanguageChange={vi.fn()}
        onSubmit={onSubmit}
        backHref="/login"
        signInHref="/login"
        {...props}
      />
    </div>,
  );
  return { onSubmit };
}

describe('RegisterScreen (AU2)', () => {
  it('shows the create-account form with name, email and a new password', () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: 'Plant your first seed 🌱' })).toBeTruthy();
    expect(screen.getByLabelText('Your name').getAttribute('autocomplete')).toBe('name');
    const password = screen.getByLabelText('Password');
    expect(password.getAttribute('autocomplete')).toBe('new-password');
    expect(password.getAttribute('minlength')).toBe('6');
    expect(password.getAttribute('placeholder')).toBe('At least 6 characters');
    expect(document.body.textContent).toContain(
      'By creating an account, you agree to our Terms of Service and Privacy Policy.',
    );
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/login');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('submits the trimmed name, email and password', () => {
    const { onSubmit } = renderScreen();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: '  Minh ' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'minh@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'gardenpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Minh', email: 'minh@example.com', password: 'gardenpass', donate: false });
  });

  it('has no voice donation box unless asked for', () => {
    renderScreen();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('voice donation: the optional box is unticked and its answer is submitted', () => {
    const { onSubmit } = renderScreen({ donation: { howHref: '/privacy#p4' } });
    const box = screen.getByRole('checkbox', { name: /Let Dygo keep my speaking recordings/ });
    expect((box as HTMLInputElement).checked).toBe(false);
    const learnMore = screen.getByRole('link', { name: 'Learn more' });
    expect(learnMore.getAttribute('href')).toBe('/privacy#p4');
    expect(learnMore.getAttribute('target')).toBe('_blank');
    fireEvent.click(box);
    expect((box as HTMLInputElement).checked).toBe(true);
    fireEvent.submit(box.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ donate: true }));
  });

  it('shows one sign-up error that never says the email is taken', () => {
    renderScreen({ error: 'failed' });
    expect(screen.getByRole('alert').textContent).not.toMatch(/already (registered|exists)/i);
  });
});

describe('RegisterScreen (AU3, from an invite)', () => {
  it('shows the invite banner and the join wording', () => {
    renderScreen({
      joining: true,
      invite: { inviterName: 'Minh', groupName: 'IELTS Sprint · Week 3' },
      signInHref: '/login?next=%2Fjoin%2Fabc',
    });
    expect(screen.getByText('Minh invited you to join')).toBeTruthy();
    expect(screen.getByText('IELTS Sprint · Week 3')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account & join' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in to join' }).getAttribute('href')).toBe(
      '/login?next=%2Fjoin%2Fabc',
    );
  });

  it('keeps the join wording without a banner when the preview is unknown', () => {
    renderScreen({ joining: true, invite: null });
    expect(screen.queryByText(/invited you to/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Create account & join' })).toBeTruthy();
  });
});

describe('auth paths', () => {
  it('finds the invite token in a join next path', () => {
    expect(inviteTokenFromNext('/join/abc123')).toBe('abc123');
    expect(inviteTokenFromNext('/join/abc123')).toBe('abc123');
    expect(inviteTokenFromNext('/topics')).toBeNull();
    expect(inviteTokenFromNext(null)).toBeNull();
  });

  it('carries next to the other auth page', () => {
    expect(authHrefWithNext('/login', '/join/abc')).toBe('/login?next=%2Fjoin%2Fabc');
    expect(authHrefWithNext('/login', null)).toBe('/login');
  });
});
