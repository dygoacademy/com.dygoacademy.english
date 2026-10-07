import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

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

import { OnboardBedLive } from './OnboardBedLive';
import { OnboardGoalLive } from './OnboardGoalLive';
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

describe('OB1 live', () => {
  it('Skip saves B1 and opens OB2 (D-7: no level check)', () => {
    succeed();
    garden(<OnboardLevelLive />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(mutate).toHaveBeenCalledWith({ cefr_level: 'B1' }, expect.anything());
    expect(push).toHaveBeenCalledWith('/welcome/goal');
  });

  it('"Not sure?" also starts at B1', () => {
    succeed();
    garden(<OnboardLevelLive />);
    fireEvent.click(screen.getByRole('button', { name: 'Not sure? Start at B1' }));
    expect(mutate).toHaveBeenCalledWith({ cefr_level: 'B1' }, expect.anything());
  });

  it('Continue saves the pick; nothing moves on when the save fails', () => {
    garden(<OnboardLevelLive />);
    fireEvent.click(screen.getByRole('radio', { name: /academic texts/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mutate).toHaveBeenCalledWith({ cefr_level: 'C1' }, expect.anything());
    expect(push).not.toHaveBeenCalled();
  });
});

describe('OB2 live', () => {
  it('saves the goal with its band and opens OB3', () => {
    succeed();
    garden(<OnboardGoalLive />);
    fireEvent.click(screen.getByRole('radio', { name: /IELTS/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Raise target' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mutate).toHaveBeenCalledWith({ study_goal: 'IELTS', target_band: 7.5 }, expect.anything());
    expect(push).toHaveBeenCalledWith('/welcome/bed');
  });

  it('starts from the saved choice; just for life sends no band', () => {
    succeed();
    onboardingState.data = { ...(onboardingState.data as object), study_goal: 'PTE', target_band: 79 };
    garden(<OnboardGoalLive />);
    expect(screen.getByText('79')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Just for life/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mutate).toHaveBeenCalledWith({ study_goal: 'LIFE', target_band: null }, expect.anything());
  });
});

describe('OB3 live', () => {
  it('saves the picked topic as the first bed', () => {
    succeed();
    topicsState.data = [
      { id: 't1', title: 'AWL Sublist 1', word_count: '60', kind: 'library', min_level: 'B2', max_level: 'C1' },
    ];
    garden(<OnboardBedLive />);
    fireEvent.click(screen.getByRole('radio', { name: /AWL Sublist 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Plant this bed' }));
    expect(mutate).toHaveBeenCalledWith({ first_topic_id: 't1' }, expect.anything());
    expect(push).toHaveBeenCalledWith('/welcome/reminder');
  });

  it('with no topics, continues without saving one', () => {
    garden(<OnboardBedLive />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mutate).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/welcome/reminder');
  });
});

describe('OB4 live', () => {
  function grant(permission: NotificationPermission) {
    vi.stubGlobal('Notification', { permission });
  }

  it('asks for notifications only after a time is picked, then saves the reminder on', async () => {
    grant('granted');
    garden(<OnboardReminderLive />);
    expect(pushState.subscribe).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Morning ·/ }));
    expect(pushState.subscribe).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Remind me at/ }));
    });
    expect(pushState.subscribe).toHaveBeenCalledOnce();
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ reminderTime: '07:30', isEnabled: true }));
    expect(push).toHaveBeenCalledWith('/welcome/ready');
    vi.unstubAllGlobals();
  });

  it('a refused prompt still saves the time, switched off, and explains', async () => {
    grant('denied');
    garden(<OnboardReminderLive />);
    fireEvent.click(screen.getByRole('button', { name: /^Evening ·/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Remind me at/ }));
    });
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ reminderTime: '19:00', isEnabled: false }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/Notifications are off/);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(push).toHaveBeenCalledWith('/welcome/ready');
    vi.unstubAllGlobals();
  });

  it('Skip touches nothing', () => {
    garden(<OnboardReminderLive />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(pushState.subscribe).not.toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/welcome/ready');
  });
});

describe('OB5 live', () => {
  it('reads back the choices, finishes onboarding and opens the garden', async () => {
    succeed();
    onboardingState.data = {
      onboarded_at: null,
      cefr_level: 'B2',
      study_goal: 'PTE',
      target_band: 65,
      first_topic_id: 't1',
    };
    topicsState.data = [{ id: 't1', title: 'AWL Sublist 1', word_count: '60' }];
    schedulesState.data = [{ id: 's1', reminder_time: '07:30:00', timezone: 'UTC', is_enabled: true }];
    garden(<OnboardReadyLive />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('GoalPTE · 65');
    expect(text).toContain('First bedAWL Sublist 1');
    expect(text).toMatch(/Reminder7:30\sAM/);
    fireEvent.click(screen.getByRole('button', { name: 'Water your first words' }));
    expect(mutate).toHaveBeenCalledWith({ complete: true }, expect.anything());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/garden'));
    expect(refresh).toHaveBeenCalled();
  });

  it('a reminder that is switched off reads Off', () => {
    schedulesState.data = [{ id: 's1', reminder_time: '19:00:00', timezone: 'UTC', is_enabled: false }];
    garden(<OnboardReadyLive />);
    expect(document.body.textContent).toContain('ReminderOff');
  });
});
