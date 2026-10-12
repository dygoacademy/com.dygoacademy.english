import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { OnboardLevelScreen } from './OnboardLevelScreen';
import { OnboardReadyScreen } from './OnboardReadyScreen';
import { OnboardReminderScreen } from './OnboardReminderScreen';

const garden = (ui: React.ReactElement) => renderWithIntl(<div data-ui="garden">{ui}</div>);

const levelProps = {
  onLevelChange: vi.fn(),
  onGoalChange: vi.fn(),
  onBandStep: vi.fn(),
  onContinue: vi.fn(),
  back: '/register',
};

describe('Onboarding progress header', () => {
  it('is step 1 of 2 on OB1 and step 2 of 2 on OB4', () => {
    const { unmount } = garden(<OnboardLevelScreen level="B1" goal={null} band={0} {...levelProps} />);
    expect(screen.getByRole('progressbar', { name: 'Step 1 of 2' }).getAttribute('aria-valuenow')).toBe('1');
    unmount();
    garden(<OnboardReminderScreen choice="morning" onChoiceChange={vi.fn()} onConfirm={vi.fn()} onNotNow={vi.fn()} back="/welcome/level" />);
    expect(screen.getByRole('progressbar', { name: 'Step 2 of 2' }).getAttribute('aria-valuenow')).toBe('2');
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/welcome/level');
  });
});

describe('OnboardLevelScreen (OB1 About you)', () => {
  it('offers four level tiles and five goal chips; Continue waits for a goal', () => {
    const onLevelChange = vi.fn();
    const onGoalChange = vi.fn();
    garden(
      <OnboardLevelScreen
        level="B1"
        goal={null}
        band={0}
        {...levelProps}
        onLevelChange={onLevelChange}
        onGoalChange={onGoalChange}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Let’s set up your garden' })).toBeTruthy();
    const levels = within(screen.getByRole('radiogroup', { name: 'Your English today' })).getAllByRole('radio');
    expect(levels.map((tile) => tile.textContent)).toEqual([
      'Just startingA1–A2',
      'Getting thereB1',
      'ComfortableB2',
      'AdvancedC1',
    ]);
    expect(levels[1].getAttribute('aria-checked')).toBe('true');
    const goals = within(screen.getByRole('radiogroup', { name: 'What are you growing towards?' })).getAllByRole('radio');
    expect(goals.map((chip) => chip.textContent)).toEqual([
      'IELTS Academic',
      'IELTS General',
      'Work',
      'Travel',
      'Just for me',
    ]);
    expect(screen.getByText('Not sure? Pick the closest; Dygo adjusts as you learn.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Target band')).toBeNull();

    fireEvent.click(levels[2]);
    expect(onLevelChange).toHaveBeenCalledWith('B2');
    fireEvent.click(goals[3]);
    expect(onGoalChange).toHaveBeenCalledWith('TRAVEL');
  });

  it('shows the band row only for the IELTS goals', () => {
    const onBandStep = vi.fn();
    const { rerender } = garden(
      <OnboardLevelScreen level="B2" goal="IELTS_GENERAL" band={7} {...levelProps} onBandStep={onBandStep} />,
    );
    expect(screen.getByText('Target band')).toBeTruthy();
    expect(screen.getByText('7.0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Raise target' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lower target' }));
    expect(onBandStep.mock.calls).toEqual([[1], [-1]]);

    rerender(
      <div data-ui="garden">
        <OnboardLevelScreen level="B2" goal="WORK" band={0} {...levelProps} />
      </div>,
    );
    expect(screen.queryByText('Target band')).toBeNull();
  });

  it('stops the band at 9.0 and shows a save error in gold', () => {
    const onContinue = vi.fn();
    garden(<OnboardLevelScreen level="C1" goal="IELTS" band={9} {...levelProps} onContinue={onContinue} error />);
    expect((screen.getByRole('button', { name: 'Raise target' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalled();
    expect(screen.getByRole('alert').className).toContain('text-gold-text');
  });
});

describe('OnboardReminderScreen (OB4)', () => {
  it('offers three times; the button says the picked one; Not now is there', () => {
    const onChoiceChange = vi.fn();
    const onConfirm = vi.fn();
    const onNotNow = vi.fn();
    garden(
      <OnboardReminderScreen
        choice="evening"
        onChoiceChange={onChoiceChange}
        onConfirm={onConfirm}
        onNotNow={onNotNow}
        back="/welcome/level"
      />,
    );
    const choices = screen.getAllByRole('radio');
    expect(choices.map((choice) => choice.textContent)).toEqual([
      'Morning · 7:30Before work or class',
      'Lunch · 12:30A short break',
      'Evening · 21:00Wind down with words',
    ]);
    expect(choices[2].getAttribute('aria-checked')).toBe('true');
    fireEvent.click(choices[1]);
    expect(onChoiceChange).toHaveBeenCalledWith('lunch');
    fireEvent.click(screen.getByRole('button', { name: 'Remind me at 21:00' }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onNotNow).toHaveBeenCalled();
    // No sun arc, no channel switches any more.
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});

describe('OnboardReadyScreen (OB5 All set)', () => {
  const links = { level: '/welcome/level', goal: '/welcome/level', reminder: '/welcome/reminder' };

  it('sums up Level, Goal and Reminder (no First bed row), each with Change', () => {
    const onMeet = vi.fn();
    const onLook = vi.fn();
    garden(
      <OnboardReadyScreen
        name="Minh"
        bed={{ title: 'Environment', seeds: 10 }}
        level="B2"
        goal={{ goal: 'IELTS', band: 7 }}
        reminder={{ hour: 7, minute: 30 }}
        links={links}
        onMeet={onMeet}
        onLook={onLook}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Your garden is planted, Minh' })).toBeTruthy();
    expect(screen.getByText(/^10 Environment seeds are in the ground\./)).toBeTruthy();
    const rows = screen.getAllByRole('link');
    expect(rows.map((row) => row.textContent)).toEqual([
      'LevelComfortable · B2Change',
      'GoalIELTS Academic · band 7.0Change',
      'ReminderEvery day · 7:30Change',
    ]);
    expect(rows.map((row) => row.getAttribute('href'))).toEqual([
      '/welcome/level',
      '/welcome/level',
      '/welcome/reminder',
    ]);
    expect(document.body.textContent).not.toContain('First bed');
    fireEvent.click(screen.getByRole('button', { name: 'Meet your first 5 words' }));
    expect(onMeet).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Look around the garden first' }));
    expect(onLook).toHaveBeenCalled();
  });

  it('reads well without a name, a bed or a reminder', () => {
    garden(
      <OnboardReadyScreen
        name={null}
        bed={null}
        level="B1"
        goal={{ goal: 'WORK', band: null }}
        reminder={null}
        links={links}
        onMeet={vi.fn()}
        onLook={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Your garden is planted' })).toBeTruthy();
    expect(screen.getByText(/^Your first seeds are in the ground\./)).toBeTruthy();
    const text = document.body.textContent ?? '';
    expect(text).toContain('GoalWorkChange');
    expect(text).toContain('ReminderOffChange');
  });
});
