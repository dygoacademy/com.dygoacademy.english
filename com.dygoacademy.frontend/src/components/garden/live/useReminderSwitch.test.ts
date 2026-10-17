import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const schedulesState = { data: [] as unknown[] };
vi.mock('@/hooks/useNotificationSchedules', () => ({ useNotificationSchedules: () => schedulesState }));

const mutate = vi.fn();
vi.mock('@/hooks/useUpsertSchedule', () => ({ useUpsertSchedule: () => ({ mutate }) }));

const pushState = { state: 'unsubscribed' as string, checked: true, subscribe: vi.fn() };
vi.mock('@/hooks/usePushSubscription', () => ({ usePushSubscription: () => pushState }));

vi.mock('@/lib/push', () => ({ pushBlocker: () => null }));

vi.mock('./data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data')>()),
  localTimezone: () => 'Asia/Ho_Chi_Minh',
}));

import { useReminderSwitch } from './useReminderSwitch';

const enabled = { id: 's1', reminder_time: '07:30:00', timezone: 'Asia/Ho_Chi_Minh', is_enabled: true };

beforeEach(() => {
  mutate.mockReset();
  pushState.state = 'unsubscribed';
  pushState.checked = true;
  pushState.subscribe.mockReset().mockResolvedValue(true);
  schedulesState.data = [];
});

describe('useReminderSwitch', () => {
  it('is off on a device with no push subscription, even when the schedule is on', () => {
    schedulesState.data = [enabled];
    const { result } = renderHook(() => useReminderSwitch());
    expect(result.current.on).toBe(false);
  });

  it('is on when the schedule is on and this device is subscribed, and re-saves the subscription once', () => {
    schedulesState.data = [enabled];
    pushState.state = 'subscribed';
    const { result, rerender } = renderHook(() => useReminderSwitch());
    rerender();
    expect(result.current.on).toBe(true);
    expect(pushState.subscribe).toHaveBeenCalledTimes(1);
  });

  it('turning it on saves the schedule only after the subscription reached the server', async () => {
    const { result } = renderHook(() => useReminderSwitch());
    await act(() => result.current.change(true));
    expect(pushState.subscribe).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ reminderTime: '20:00', timezone: 'Asia/Ho_Chi_Minh', isEnabled: true });
  });

  it('turning an existing reminder off sends its time as HH:MM', async () => {
    schedulesState.data = [enabled];
    pushState.state = 'subscribed';
    const { result } = renderHook(() => useReminderSwitch());
    await act(() => result.current.change(false));
    expect(mutate).toHaveBeenCalledWith({ reminderTime: '07:30', timezone: 'Asia/Ho_Chi_Minh', isEnabled: false });
  });

  it('a refused or failed subscribe saves nothing and restarts the switch', async () => {
    pushState.subscribe.mockResolvedValue(false);
    const { result } = renderHook(() => useReminderSwitch());
    const before = result.current.key;
    await act(() => result.current.change(true));
    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.key).not.toBe(before);
  });
});
