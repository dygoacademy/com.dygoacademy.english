import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

const push = vi.fn();
const refresh = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, back }) }));

const mutate = vi.fn();
const onboardingState = { data: undefined as unknown, isPending: false, isError: false, refetch: vi.fn() };
vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => onboardingState,
  useUpdateOnboarding: () => ({ mutate, isPending: false, isError: false }),
}));

const topicsState = { data: [] as unknown[], isPending: false, isError: false, refetch: vi.fn() };
vi.mock('@/hooks/useTopics', () => ({ useTopics: () => topicsState }));

const schedulesState = { data: [] as unknown[] };
vi.mock('@/hooks/useNotificationSchedules', () => ({ useNotificationSchedules: () => schedulesState }));

const mutateAsync = vi.fn();
vi.mock('@/hooks/useUpsertSchedule', () => ({ useUpsertSchedule: () => ({ mutateAsync }) }));

const pushState = { state: 'unsubscribed' as string, subscribe: vi.fn() };
vi.mock('@/hooks/usePushSubscription', () => ({ usePushSubscription: () => pushState }));

const userState = { data: { user_metadata: { full_name: 'Minh Tran' } } as unknown };
vi.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: () => userState }));

vi.mock('./data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data')>()),
  localTimezone: () => 'Asia/Ho_Chi_Minh',
}));

import { OnboardLevelLive } from './OnboardLevelLive';
import { OnboardReadyLive } from './OnboardReadyLive';
import { OnboardReminderLive } from './OnboardReminderLive';

/** Runs the mutate's onSuccess, as a successful PATCH would. */
function succeed() {
  mutate.mockImplementation((_change, options?: { onSuccess?: () => void }) => options?.onSuccess?.());
}

const garden = (ui: React.ReactElement) => renderWithIntl(<div data-ui="garden">{ui}</div>);

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  back.mockReset();
  mutate.mockReset();
  mutateAsync.mockReset().mockResolvedValue({});
  pushState.state = 'unsubscribed';
  pushState.subscribe.mockReset();
  onboardingState.data = {
    onboarded_at: null,
    cefr_level: null,
    study_goal: null,
    target_band: null,
    first_topic_id: null,
  };
  onboardingState.isPending = false;
  topicsState.data = [];
  schedulesState.data = [];
});

describe('OB1 About you live', () => {
  it('starts on B1 and saves level, goal, band and time zone in one PATCH, then opens OB4', () => {
    succeed();
    garden(<OnboardLevelLive />);
    expect(screen.getByRole('radio', { name: /Getting there/ }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: /Comfortable/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'IELTS Academic' }));
    fireEvent.click(screen.getByRole('button', { name: 'Raise target' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(
      { cefr_level: 'B2', study_goal: 'IELTS', target_band: 7.5, timezone: 'Asia/Ho_Chi_Minh' },
      expect.anything(),
    );
    expect(push).toHaveBeenCalledWith('/welcome/reminder');
  });

  it('a goal without a band clears it', () => {
    garden(<OnboardLevelLive />);
    fireEvent.click(screen.getByRole('radio', { name: 'IELTS General' }));
    expect(screen.getByText('Target band')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Work' }));
    expect(screen.queryByText('Target band')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mutate).toHaveBeenCalledWith(
      { cefr_level: 'B1', study_goal: 'WORK', target_band: null, timezone: 'Asia/Ho_Chi_Minh' },
      expect.anything(),
    );
    // The save failed: nothing moves on.
    expect(push).not.toHaveBeenCalled();
  });

  it('comes back to what was saved (Change on OB5)', () => {
    onboardingState.data = {
      onboarded_at: null,
      cefr_level: 'C1',
      study_goal: 'IELTS_GENERAL',
      target_band: 6.5,
      first_topic_id: 't1',
    };
    garden(<OnboardLevelLive />);
    expect(screen.getByRole('radio', { name: /Advanced/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'IELTS General' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('6.5')).toBeTruthy();
  });

  it('an old PTE goal is not on screen, so a goal must be picked again', () => {
    onboardingState.data = { onboarded_at: null, cefr_level: 'B1', study_goal: 'PTE', target_band: 65, first_topic_id: null };
    garden(<OnboardLevelLive />);
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Back returns to where sign-up came from', () => {
    garden(<OnboardLevelLive />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(back.mock.calls.length + push.mock.calls.length).toBe(1);
  });
});

describe('OB4 Reminder live', () => {
  function grant(permission: NotificationPermission) {
    vi.stubGlobal('Notification', { permission });
  }

  it('Remind me asks for notifications first, then saves the time on with the time zone', async () => {
    const order: string[] = [];
    mutateAsync.mockImplementation(async () => order.push('save'));
    pushState.subscribe.mockImplementation(async () => {
      order.push('ask');
      return true;
    });
    garden(<OnboardReminderLive />);
    expect(pushState.subscribe).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: /^Lunch/ }));
    expect(pushState.subscribe).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remind me at 12:30' }));
    });
    // Asking first keeps the prompt inside the tap (iPhone needs that), and
    // the reminder is only saved on once the subscription reached the server.
    expect(order).toEqual(['ask', 'save']);
    expect(mutateAsync).toHaveBeenCalledWith({
      reminderTime: '12:30',
      timezone: 'Asia/Ho_Chi_Minh',
      isEnabled: true,
    });
    expect(push).toHaveBeenCalledWith('/welcome/ready');
  });

  it('starts on Morning; a refused or failed subscribe saves the reminder off and goes on', async () => {
    pushState.subscribe.mockResolvedValue(false);
    garden(<OnboardReminderLive />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remind me at 7:30' }));
    });
    expect(mutateAsync.mock.calls.map(([change]) => change.isEnabled)).toEqual([false]);
    expect(push).toHaveBeenCalledWith('/welcome/ready');
  });

  it('Not now saves the reminder off and asks nothing', async () => {
    garden(<OnboardReminderLive />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    });
    expect(pushState.subscribe).not.toHaveBeenCalled();
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ reminderTime: '07:30', isEnabled: false }));
    expect(push).toHaveBeenCalledWith('/welcome/ready');
  });

  it('a failed save still lets the learner go on', async () => {
    mutateAsync.mockRejectedValue(new Error('offline'));
    garden(<OnboardReminderLive />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remind me at 7:30' }));
    });
    expect(push).toHaveBeenCalledWith('/welcome/ready');
  });
});

describe('OB5 All set live', () => {
  it('reads back three rows, finishes onboarding and meets 5 words from the first bed', async () => {
    succeed();
    onboardingState.data = {
      onboarded_at: null,
      cefr_level: 'B2',
      study_goal: 'IELTS',
      target_band: 7,
      first_topic_id: 't1',
    };
    topicsState.data = [{ id: 't1', title: 'Environment', word_count: '60' }];
    schedulesState.data = [{ id: 's1', reminder_time: '07:30:00', timezone: 'UTC', is_enabled: true }];
    garden(<OnboardReadyLive />);
    expect(screen.getByRole('heading', { name: 'Your garden is planted, Minh' })).toBeTruthy();
    expect(screen.getByText(/^10 Environment seeds/)).toBeTruthy();
    const text = document.body.textContent ?? '';
    expect(text).toContain('GoalIELTS Academic · band 7.0');
    expect(text).toContain('ReminderEvery day · 7:30');
    expect(text).not.toContain('First bed');
    fireEvent.click(screen.getByRole('button', { name: 'Meet your first 5 words' }));
    expect(mutate).toHaveBeenCalledWith({ complete: true }, expect.anything());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/review?new=5&topic=t1'));
    expect(refresh).toHaveBeenCalled();
  });

  it('"Look around the garden first" also finishes, and opens the garden', async () => {
    succeed();
    garden(<OnboardReadyLive />);
    fireEvent.click(screen.getByRole('button', { name: 'Look around the garden first' }));
    expect(mutate).toHaveBeenCalledWith({ complete: true }, expect.anything());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/garden'));
  });

  it('a reminder that is switched off reads Off; a small bed plants what it has', () => {
    onboardingState.data = { onboarded_at: null, cefr_level: 'B1', study_goal: 'TRAVEL', target_band: null, first_topic_id: 't2' };
    topicsState.data = [{ id: 't2', title: 'Travel', word_count: '6' }];
    schedulesState.data = [{ id: 's1', reminder_time: '21:00:00', timezone: 'UTC', is_enabled: false }];
    garden(<OnboardReadyLive />);
    expect(screen.getByText(/^6 Travel seeds/)).toBeTruthy();
    expect(document.body.textContent).toContain('ReminderOff');
  });
});
