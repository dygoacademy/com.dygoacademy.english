import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { AccountSheetLive } from './live/AccountSheetLive';
import { MeScreen } from './screens/MeScreen';
import { ACCOUNT, ME } from './screens/fixtures';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => '/me',
}));

const signOut = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut } }),
}));

function Harness({ queryClient }: { queryClient: QueryClient }) {
  const [open, setOpen] = React.useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <div data-ui="garden">
        <MeScreen
          {...ME}
          dailyGoal={null}
          reminder={null}
          family={null}
          stickyNav={false}
          onAccountClick={() => setOpen(true)}
        />
        <AccountSheetLive open={open} onOpenChange={setOpen} name={ME.name} email={ACCOUNT.email} />
      </div>
    </QueryClientProvider>
  );
}

function setup() {
  const queryClient = new QueryClient();
  const clear = vi.spyOn(queryClient, 'clear');
  renderWithIntl(<Harness queryClient={queryClient} />);
  fireEvent.click(screen.getByRole('button', { name: 'Account' }));
  return { clear };
}

describe('A8 Account sheet (SO-1)', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    signOut.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('opens from the gear with who is signed in', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    expect(dialog.textContent).toContain('Minh');
    expect(screen.getByText('Signed in as minh@example.com')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('closes on Cancel without signing out', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(signOut).not.toHaveBeenCalled();
  });

  it('signs out once, clears the query cache and goes to /login', async () => {
    let resolve!: (value: { error: null }) => void;
    signOut.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { clear } = setup();
    const button = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(button);
    const busy = screen.getByRole('button', { name: 'Signing out…' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(busy);
    await act(async () => resolve({ error: null }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('falls back to a local sign-out when the server call fails', async () => {
    signOut.mockResolvedValueOnce({ error: new Error('network') }).mockResolvedValueOnce({ error: null });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(signOut).toHaveBeenLastCalledWith({ scope: 'local' });
  });

  it('keeps the sheet open and shows the toast when sign-out fails', async () => {
    signOut.mockResolvedValue({ error: new Error('down') });
    const { clear } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain("Couldn't sign out"),
    );
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Sign out' }) as HTMLButtonElement).disabled).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
});
