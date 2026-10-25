'use client';

import * as React from 'react';

import { hexesLit } from '@/hooks/useMicLevel';
import { METER_HEXES, meterHexes } from '@/lib/pronunciation/comb';

import { gcn } from '../cn';

/**
 * P2's "Your voice" card (honeycomb plan §3 P2): the label, "Starting…"
 * (grey, during the beep) or a blinking clay dot and "Recording", and a
 * strip of 21 mini hexagons lit from the left by the live mic level. It
 * shows how loud, never how good.
 */
export function VoiceMeterComb({
  level,
  recording,
  label,
  status,
  className,
}: {
  /** 0–1, smoothed (useMicLevel); 0 before the voice. */
  level: number;
  /** False during the beep ("Starting…"). */
  recording: boolean;
  label: string;
  status: string;
  className?: string;
}) {
  const lit = recording ? hexesLit(level, METER_HEXES) : 0;
  return (
    <div className={gcn('flex items-center gap-3 rounded-[18px] border border-border bg-surface px-3.5 py-2.5', className)}>
      <span className="flex min-w-[86px] shrink-0 flex-col gap-0.5 whitespace-nowrap">
        <span className="text-[12px] font-bold uppercase tracking-[.06em] text-muted-foreground">{label}</span>
        <span
          className={gcn(
            'flex items-center gap-1.5 text-[13px] font-bold',
            recording ? 'text-[var(--color-primary)]' : 'text-muted-foreground',
          )}
        >
          {recording ? (
            <span aria-hidden="true" className="comb-blink h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
          ) : null}
          {status}
        </span>
      </span>
      <svg viewBox="0 0 200 40" aria-hidden="true" data-lit={lit} className="block h-auto min-w-0 flex-1">
        {meterHexes().map((h, i) => (
          <polygon key={i} points={h.points} fill={i < lit ? h.fill : 'var(--comb-meter-empty)'} />
        ))}
      </svg>
    </div>
  );
}

const BARS = 40;
const STEP = 8.2;

/**
 * P4's mirror waveform (plan §3 P4): 40 native bars above the centre line,
 * 40 of the learner's below. On retry / almost the weak syllable's zone is
 * tinted with its tag. A side not ready (or not decodable) is a flat
 * skeleton row.
 */
export function MirrorWave({
  native,
  mine,
  zone,
  label,
  className,
}: {
  native: readonly number[] | null;
  mine: readonly number[] | null;
  /** The weak syllable's share of the word (0–1) and its tag. */
  zone?: { start: number; end: number; tag: string } | null;
  label: string;
  className?: string;
}) {
  const at = (bars: readonly number[] | null, i: number) =>
    bars && bars.length ? bars[Math.min(bars.length - 1, Math.floor((i * bars.length) / BARS))] : null;
  const width = BARS * STEP;
  return (
    <svg viewBox="0 0 330 70" role="img" aria-label={label} className={gcn('block h-auto min-w-0 flex-1', className)}>
      {zone ? (
        <>
          <rect x={zone.start * width} y="2" width={Math.max(8, (zone.end - zone.start) * width)} height="66" rx="8" fill="var(--wave-zone)" />
          <text
            x={((zone.start + zone.end) / 2) * width}
            y="10"
            textAnchor="middle"
            fontFamily="DM Sans, sans-serif"
            fontWeight={800}
            fontSize={9}
            fill="var(--color-primary-text)"
          >
            {zone.tag}
          </text>
        </>
      ) : null}
      {Array.from({ length: BARS }, (_, i) => {
        const n = at(native, i);
        const m = at(mine, i);
        // Native bars stop below the zone tag (y 12); the learner's use the full half.
        const nh = n === null ? 3 : 3 + 19 * n;
        const mh = m === null ? 3 : Math.min(32, 3 + 29 * m);
        const x = (2 + i * STEP).toFixed(1);
        return (
          <g key={i}>
            <rect x={x} y={(34 - nh).toFixed(1)} width="4" height={nh.toFixed(1)} rx="2" fill={n === null ? 'var(--color-border)' : 'var(--comb-ok)'} />
            <rect x={x} y="36" width="4" height={mh.toFixed(1)} rx="2" fill={m === null ? 'var(--color-border)' : 'var(--color-primary)'} />
          </g>
        );
      })}
      <path d="M0 35 H330" stroke="var(--color-border)" strokeWidth="1" />
    </svg>
  );
}

/** P4's match ring (54px): the overall % in the middle; green, or amber on a retry. */
export function MatchRing({ value, tone, label }: { value: number; tone: 'ok' | 'retry'; label: string }) {
  const c = 2 * Math.PI * 23;
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg width="54" height="54" viewBox="0 0 56 56" role="img" aria-label={label} className="shrink-0">
      <circle cx="28" cy="28" r="23" fill="none" stroke="var(--ring-track)" strokeWidth="6" />
      <circle
        cx="28"
        cy="28"
        r="23"
        fill="none"
        stroke={tone === 'retry' ? 'var(--comb-honey-dark)' : 'var(--comb-ok)'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${((c * v) / 100).toFixed(1)} ${c.toFixed(1)}`}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="33" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontWeight={800} fontSize={15} fill="var(--color-text)">
        {`${v}%`}
      </text>
    </svg>
  );
}
