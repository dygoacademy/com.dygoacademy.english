import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { OnboardBedScreen } from './OnboardBedScreen';
import { OnboardGoalScreen } from './OnboardGoalScreen';
import { OnboardLevelScreen } from './OnboardLevelScreen';
import { OnboardReadyScreen } from './OnboardReadyScreen';
import { OnboardReminderScreen } from './OnboardReminderScreen';

const garden = (ui: React.ReactElement) => renderWithIntl(<div data-ui="garden">{ui}</div>);

describe('Onboarding progress header', () => {
  it('marks the current step of four, one plant per step', () => {
    garden(
      <OnboardLevelScreen level={null} onSelect={vi.fn()} onContinue={vi.fn()} onSkip={vi.fn()} onNotSure={vi.fn()} />,
    );
    const progress = screen.getByRole('list', { name: 'Step 1 of 4' });
    const steps = within(progress).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    // Steps to come are still seeds.
    expect(steps.map((step) => step.querySelector('svg')?.getAttribute('data-stage'))).toEqual([
      'seed',
      'seed',
      'seed',
      'seed',
    ]);
  });

  it('OB5 shows all four grown: seed → sprout → flower → fruit tree', () => {
    garden(
      <OnboardReadyScreen level="B1" goal={null} bed={null} reminder={null} onWater={vi.fn()} back="/welcome/reminder" />,
    );
    const progress = screen.getByRole('list', { name: 'All four steps done' });
    expect(
      within(progress)
        .getAllByRole('listitem')
        .map((step) => step.querySelector('svg')?.getAttribute('data-stage')),
    ).toEqual(['seed', 'sprout', 'flower', 'tree']);
  });
});

describe('OnboardLevelScreen (OB1)', () => {
  it('offers four "I can…" sentences, A2–C1, and waits for a pick', () => {
    const props = { onSelect: vi.fn(), onContinue: vi.fn(), onSkip: vi.fn(), onNotSure: vi.fn() };
    garden(<OnboardLevelScreen level={null} {...props} />);
    expect(screen.getByRole('heading', { name: 'How much English do you have?' })).toBeTruthy();
    const options = within(screen.getByRole('radiogroup')).getAllByRole('radio');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('I can talk about my day'),
      expect.stringContaining('I can follow the main points'),
      expect.stringContaining('I can discuss most topics'),
      expect.stringContaining('I can read academic texts'),
    ]);
    expect(options.map((option) => option.textContent?.slice(-2))).toEqual(['A2', 'B1', 'B2', 'C1']);
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
    // No back button on the first step.
    expect(screen.queryByRole('link', { name: 'Back' })).toBeNull();

    fireEvent.click(options[2]);
    expect(props.onSelect).toHaveBeenCalledWith('B2');
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(props.onSkip).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Not sure? Start at B1' }));
    expect(props.onNotSure).toHaveBeenCalled();
  });

  it('continues with the picked level and shows a save error in gold', () => {
    const onContinue = vi.fn();
    garden(
      <OnboardLevelScreen level="B2" onSelect={vi.fn()} onContinue={onContinue} onSkip={vi.fn()} onNotSure={vi.fn()} error />,
    );
    expect(screen.getByRole('radio', { checked: true }).textContent).toContain('B2');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalled();
    expect(screen.getByRole('alert').className).toContain('text-gold-text');
  });
});

describe('OnboardGoalScreen (OB2)', () => {
  const base = { onGoalChange: vi.fn(), onBandStep: vi.fn(), onContinue: vi.fn(), back: '/welcome/level' };

  it('offers IELTS, PTE and just for life, with Back to OB1', () => {
    garden(<OnboardGoalScreen goal={null} band={0} {...base} />);
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      expect.stringContaining('IELTS'),
      expect.stringContaining('PTE'),
      expect.stringContaining('Just for life'),
    ]);
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/welcome/level');
    expect(screen.queryByText('Target band')).toBeNull();
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('IELTS shows the target band stepper', () => {
    const onBandStep = vi.fn();
    garden(<OnboardGoalScreen goal="IELTS" band={7} {...base} onBandStep={onBandStep} />);
    expect(screen.getByText('Target band')).toBeTruthy();
    expect(screen.getByText('7.0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Raise target' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lower target' }));
    expect(onBandStep.mock.calls).toEqual([[1], [-1]]);
  });

  it('the stepper stops at the ends of the range', () => {
    garden(<OnboardGoalScreen goal="PTE" band={90} {...base} />);
    expect(screen.getByText('Target score')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Raise target' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Lower target' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('just for life has no target', () => {
    garden(<OnboardGoalScreen goal="LIFE" band={0} {...base} />);
    expect(screen.queryByRole('button', { name: 'Raise target' })).toBeNull();
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('OnboardBedScreen (OB3)', () => {
  const packets = [
    { id: 't1', title: 'AWL Sublist 1', words: 60, level: 'B2–C1' },
    { id: 't2', title: 'Travel', words: 1, level: null },
  ];

  it('shows the topics as seed packets and plants the one picked', () => {
    const onSelect = vi.fn();
    const onContinue = vi.fn();
    const { rerender } = garden(
      <OnboardBedScreen packets={packets} selectedId={null} onSelect={onSelect} onContinue={onContinue} back="/welcome/goal" />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios[0].textContent).toContain('AWL Sublist 1');
    expect(radios[0].textContent).toContain('60 words · B2–C1');
    expect(radios[1].textContent).toContain('1 word');
    expect((screen.getByRole('button', { name: 'Plant this bed' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith('t2');

    rerender(
      <div data-ui="garden">
        <OnboardBedScreen packets={packets} selectedId="t2" onSelect={onSelect} onContinue={onContinue} back="/welcome/goal" />
      </div>,
    );
    expect(screen.getByRole('radio', { checked: true }).textContent).toContain('Travel');
    fireEvent.click(screen.getByRole('button', { name: 'Plant this bed' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('with no topics, says so and lets the learner continue', () => {
    const onContinue = vi.fn();
    garden(<OnboardBedScreen packets={[]} selectedId={null} onSelect={vi.fn()} onContinue={onContinue} back="/welcome/goal" />);
    expect(screen.getByText(/No topics to plant yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalled();
  });
});

describe('OnboardReminderScreen (OB4)', () => {
  const base = { onConfirm: vi.fn(), onSkip: vi.fn(), back: '/welcome/bed' };

  it('asks for nothing until a time is picked; presets pick one', () => {
    const onTimeChange = vi.fn();
    garden(<OnboardReminderScreen time={null} onTimeChange={onTimeChange} {...base} />);
    expect((screen.getByRole('button', { name: 'Pick a time' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^Morning ·/ }));
    expect(onTimeChange).toHaveBeenCalledWith({ hour: 7, minute: 30 });
  });

  it('with a time, the button says when, and Skip is there', () => {
    const onConfirm = vi.fn();
    const onSkip = vi.fn();
    garden(
      <OnboardReminderScreen time={{ hour: 19, minute: 0 }} onTimeChange={vi.fn()} {...base} onConfirm={onConfirm} onSkip={onSkip} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Remind me at 7:00\sPM$/ }));
    expect(onConfirm).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Evening ·/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalled();
  });

  it('the sun is a slider: arrow keys move it by a quarter hour', () => {
    const onTimeChange = vi.fn();
    garden(<OnboardReminderScreen time={{ hour: 7, minute: 30 }} onTimeChange={onTimeChange} {...base} />);
    const slider = screen.getByRole('slider', { name: 'Reminder time' });
    expect(slider.getAttribute('aria-valuenow')).toBe(String(7 * 60 + 30));
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onTimeChange.mock.calls).toEqual([
      [{ hour: 7, minute: 45 }],
      [{ hour: 7, minute: 15 }],
      [{ hour: 23, minute: 0 }],
    ]);
  });

  it('explains a refused prompt and then just continues', () => {
    garden(
      <OnboardReminderScreen time={{ hour: 7, minute: 30 }} onTimeChange={vi.fn()} {...base} notice="denied" />,
    );
    expect(screen.getByRole('status').textContent).toMatch(/Notifications are off/);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });
});

describe('OnboardReadyScreen (OB5)', () => {
  it('sums up the four choices and waters the first words', () => {
    const onWater = vi.fn();
    garden(
      <OnboardReadyScreen
        level="B2"
        goal={{ goal: 'IELTS', band: 7 }}
        bed="AWL Sublist 1"
        reminder={{ hour: 7, minute: 30 }}
        onWater={onWater}
        back="/welcome/reminder"
      />,
    );
    const summary = screen.getByRole('heading', { name: 'Your garden is ready' }).closest('div')!.parentElement!;
    const text = summary.textContent ?? '';
    expect(text).toContain('LevelB2');
    expect(text).toContain('GoalIELTS · 7.0');
    expect(text).toContain('First bedAWL Sublist 1');
    expect(text).toMatch(/Reminder7:30\sAM/);
    expect(screen.getByText('You can change any of these later in Me.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Water your first words' }));
    expect(onWater).toHaveBeenCalled();
  });

  it('shows what was skipped', () => {
    garden(
      <OnboardReadyScreen level="B1" goal={{ goal: 'LIFE', band: null }} bed={null} reminder={null} onWater={vi.fn()} back="/welcome/reminder" />,
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('GoalJust for life');
    expect(text).toContain('First bedNot set');
    expect(text).toContain('ReminderOff');
  });
});
