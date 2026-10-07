'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '../Button';
import { Chip } from '../Chip';
import { gcn } from '../cn';
import type { ClockTime } from '../format';
import { useGardenFormat } from '../format';
import {
  ARC_END_MINUTES,
  ARC_SNAP_MINUTES,
  ARC_START_MINUTES,
  arcFraction,
  arcPoint,
  clockToMinutes,
  minutesToClock,
  partOfDay,
  pointToClock,
  REMINDER_PRESETS,
} from '../live/onboarding';
import { OnboardingShell } from '../OnboardingShell';

/**
 * OB4 · Reminder time (board `OnboardReminder`, not in the repo yet).
 * Props only (the drag state is the parent's `time`).
 *
 * Drag the sun along a morning → night arc (06:00–23:00, quarter-hour
 * snaps; arrow keys too, it's a slider), or tap a preset. Nothing is asked
 * of the browser until a time is chosen: the button then reads "Remind me
 * at 7:30", and only pressing it asks for notifications (the live wrapper).
 * Skip goes on without a reminder. `notice` explains a refused or
 * unsupported prompt; the button then just continues.
 */
export interface OnboardReminderScreenProps {
  /** null until the learner picks a time. */
  time: ClockTime | null;
  onTimeChange: (time: ClockTime) => void;
  onConfirm: () => void;
  onSkip: () => void;
  back: string;
  saving?: boolean;
  notice?: 'denied' | 'unsupported' | 'error' | null;
}

// Arc geometry in SVG units (the SVG scales to the column width).
const W = 320;
const H = 176;
const CX = W / 2;
const CY = 150;
const R = 128;
/** Shown, faded, before anything is chosen. */
const PLACEHOLDER: ClockTime = { hour: 20, minute: 0 };

export function OnboardReminderScreen({
  time,
  onTimeChange,
  onConfirm,
  onSkip,
  back,
  saving = false,
  notice = null,
}: OnboardReminderScreenProps) {
  const t = useTranslations('screens.onboarding');
  const f = useGardenFormat();
  const shown = time ?? PLACEHOLDER;
  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragging = React.useRef(false);

  const fromPointer = (event: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const x = ((event.clientX - box.left) / box.width) * W;
    const y = ((event.clientY - box.top) / box.height) * H;
    onTimeChange(pointToClock(x, y, CX, CY));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const minutes = clockToMinutes(shown);
    const moves: Record<string, number> = {
      ArrowRight: ARC_SNAP_MINUTES,
      ArrowUp: ARC_SNAP_MINUTES,
      ArrowLeft: -ARC_SNAP_MINUTES,
      ArrowDown: -ARC_SNAP_MINUTES,
      PageUp: 60,
      PageDown: -60,
    };
    if (event.key === 'Home') onTimeChange(minutesToClock(ARC_START_MINUTES));
    else if (event.key === 'End') onTimeChange(minutesToClock(ARC_END_MINUTES));
    else if (moves[event.key] !== undefined) onTimeChange(minutesToClock(minutes + moves[event.key]));
    else return;
    event.preventDefault();
  };

  const sun = arcPoint(arcFraction(shown), CX, CY, R);
  const label = f.clock(shown);
  const sky = partOfDay(shown);

  return (
    <OnboardingShell
      step={4}
      back={back}
      onSkip={onSkip}
      title={t('reminder.title')}
      subtitle={t('reminder.subtitle')}
      footer={
        <>
          {notice ? (
            <p
              role="status"
              className="rounded-[14px] border border-water-border bg-water-soft px-3 py-2.5 text-[14px] leading-[1.35] text-water-text"
            >
              {t(`reminder.notice.${notice}`)}
            </p>
          ) : null}
          <Button variant="primary" onClick={onConfirm} disabled={!time} loading={saving}>
            {notice ? t('continue') : time ? t('reminder.confirm', { time: label }) : t('reminder.pick')}
          </Button>
        </>
      }
    >
      <div
        className={gcn(
          'flex flex-col items-center rounded-card px-3 pt-3 transition-colors duration-quick',
          sky === 'night' ? 'bg-forest' : 'bg-water-soft',
        )}
      >
        <p
          aria-hidden="true"
          className={gcn(
            'font-display text-[34px] font-semibold leading-[1.1]',
            sky === 'night' ? 'text-on-forest' : 'text-water-text',
            !time && 'opacity-50',
          )}
        >
          {label}
        </p>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            fromPointer(event);
          }}
          onPointerMove={(event) => {
            if (dragging.current) fromPointer(event);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        >
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke={sky === 'night' ? 'var(--color-on-forest-line)' : 'var(--color-water-border)'}
            strokeWidth="3"
            strokeDasharray="2 8"
            strokeLinecap="round"
          />
          <line
            x1={CX - R - 16}
            x2={CX + R + 16}
            y1={CY}
            y2={CY}
            stroke="var(--stage-tree-canopy)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <g
            role="slider"
            tabIndex={0}
            aria-label={t('reminder.slider')}
            aria-valuemin={ARC_START_MINUTES}
            aria-valuemax={ARC_END_MINUTES}
            aria-valuenow={clockToMinutes(shown)}
            aria-valuetext={label}
            onKeyDown={onKeyDown}
            className="cursor-grab outline-none focus-visible:[&>circle:first-child]:stroke-forest"
          >
            <circle cx={sun.x} cy={sun.y} r="26" fill="transparent" stroke="transparent" strokeWidth="3" />
            {sky === 'night' ? (
              <circle cx={sun.x} cy={sun.y} r="16" fill="var(--color-gold-light)" opacity={time ? 1 : 0.5} />
            ) : (
              <>
                <circle cx={sun.x} cy={sun.y} r="22" fill="var(--color-gold-light)" opacity={time ? 0.5 : 0.25} />
                <circle cx={sun.x} cy={sun.y} r="15" fill="var(--color-gold)" opacity={time ? 1 : 0.5} />
              </>
            )}
          </g>
        </svg>
        <div
          aria-hidden="true"
          className={gcn(
            'flex w-full justify-between px-1 pb-2 text-[12px] font-semibold',
            sky === 'night' ? 'text-on-forest-muted' : 'text-water-text-soft',
          )}
        >
          <span>{t('reminder.morning')}</span>
          <span>{t('reminder.night')}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {REMINDER_PRESETS.map((preset) => (
          <Chip
            key={preset.id}
            selected={
              time !== null && time.hour === preset.time.hour && time.minute === preset.time.minute
            }
            onClick={() => onTimeChange(preset.time)}
          >
            {t(`reminder.presets.${preset.id}`, { time: f.clock(preset.time) })}
          </Chip>
        ))}
      </div>
    </OnboardingShell>
  );
}
