import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '../Button';
import { gcn } from '../cn';
import { clockLabel, REMINDER_CHOICES, type ReminderChoice } from '../live/onboarding';
import { ONBOARDING_BUTTON, OnboardingShell } from '../OnboardingShell';

/**
 * OB4 · Reminder (board `OnboardReminder`, `reference/OB4-reminder.html`).
 * Props only.
 *
 * Three 72px choices: Morning 7:30 and Lunch 12:30 (sun on gold), Evening
 * 21:00 (moon on forest). "Remind me at …" saves the time and only then
 * asks the browser for notifications (the live wrapper); "Not now" goes on
 * with the reminder off. A phone notification is the default; Zalo /
 * Email and other times are in Profile › Reminder.
 */
export interface OnboardReminderScreenProps {
  choice: ReminderChoice;
  onChoiceChange: (choice: ReminderChoice) => void;
  onConfirm: () => void;
  onNotNow: () => void;
  back: string;
  saving?: boolean;
  /** Why this browser can't get reminders, shown under the choices. */
  blocked?: 'install' | 'unsupported' | 'blocked' | null;
}

export function OnboardReminderScreen({
  choice,
  onChoiceChange,
  onConfirm,
  onNotNow,
  back,
  saving = false,
  blocked = null,
}: OnboardReminderScreenProps) {
  const t = useTranslations('screens.onboarding');
  const picked = REMINDER_CHOICES.find((item) => item.id === choice) ?? REMINDER_CHOICES[0];
  return (
    <OnboardingShell
      step={2}
      back={back}
      title={t('reminder.title')}
      subtitle={t('reminder.sub')}
      footer={
        <>
          <Button variant="primary" className={ONBOARDING_BUTTON} onClick={onConfirm} loading={saving}>
            {t('reminder.cta', { time: clockLabel(picked.time) })}
          </Button>
          <button
            type="button"
            onClick={onNotNow}
            disabled={saving}
            className="self-center p-2 text-[14px] font-semibold text-muted-foreground underline"
          >
            {t('reminder.notNow')}
          </button>
        </>
      }
    >
      <div role="radiogroup" aria-label={t('reminder.title')} className="flex flex-col gap-2.5">
        {REMINDER_CHOICES.map((item) => {
          const on = item.id === choice;
          const night = item.id === 'evening';
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChoiceChange(item.id)}
              className={gcn(
                'flex h-[72px] items-center gap-3.5 rounded-[18px] border-2 px-4 text-left text-text',
                on ? 'border-forest bg-forest-wash' : 'border-border bg-surface',
              )}
            >
              <span
                aria-hidden="true"
                className={gcn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  night ? 'bg-forest text-gold-light' : 'bg-gold-soft text-[#B07A12]',
                )}
              >
                {night ? <MoonMark /> : <SunMark />}
              </span>
              <span className="flex flex-grow flex-col gap-0.5">
                <span className="text-[16px] font-bold">
                  {t('reminder.option', {
                    label: t(`reminder.${item.id}.label`),
                    time: clockLabel(item.time),
                  })}
                </span>
                <span className="text-[13px] text-muted-foreground">{t(`reminder.${item.id}.line`)}</span>
              </span>
              <span
                aria-hidden="true"
                className={gcn(
                  'box-content h-[22px] w-[22px] shrink-0 rounded-full border-2 border-forest shadow-[inset_0_0_0_3px_#FFFFFF]',
                  on ? 'bg-forest' : 'bg-surface',
                )}
              />
            </button>
          );
        })}
      </div>
      {blocked ? (
        <p role="note" className="mt-3 text-[13px] leading-snug text-muted-foreground">
          {t(`reminder.blocked.${blocked}`)}
        </p>
      ) : null}
    </OnboardingShell>
  );
}

function SunMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9" />
    </svg>
  );
}

function MoonMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 14 A8 8 0 1 1 10 4 A6 6 0 0 0 20 14 Z" />
    </svg>
  );
}
