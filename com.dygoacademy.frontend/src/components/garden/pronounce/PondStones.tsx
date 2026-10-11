import * as React from 'react';

import { layoutStones, POND, type PondSize } from '@/lib/speaking/pronounce';
import type { SpeakingSyllable } from '@/types';

import { BeeShape } from '../Bee';
import { gcn } from '../cn';

/**
 * The pond card of the Pronunciation boards (PronStones*.dc.html,
 * iPadPron*.dc.html): water edge to edge in a rounded forest card, one
 * stone per syllable (the stressed one big), the A7 bee. Every stone's
 * colour comes from its state; animations are the `.pron-*` classes in
 * globals.css (off with reduced motion).
 */
export type StoneLook = 'dark' | 'lit' | 'checking' | 'ok' | 'wobbly';

const FILL: Record<StoneLook, string> = {
  dark: 'var(--stone)',
  lit: 'var(--stone-lit)',
  checking: 'var(--stone-checking)',
  ok: 'var(--stone-ok)',
  wobbly: 'var(--stone-wobbly)',
};

/** Boards' drawing per size: viewBox height for each layout, bee scale, "?" and wobble marks. */
const SIZE: Record<
  PondSize,
  {
    wave: number;
    waveStroke: number;
    bee: number;
    question: { dx: number; dy: number; font: number };
    /** Wobble marks for a small stone, scaled by the stone's width. */
    wobble: { left: number; right: number; dy: number; w: number; h: number; stroke: number };
    hop: { start: number; land: number; arc: number; dash: string; stroke: number };
  }
> = {
  phone: {
    wave: 10,
    waveStroke: 2,
    bee: 1.7,
    question: { dx: 34, dy: -6, font: 22 },
    wobble: { left: -28, right: 16, dy: 16, w: 12, h: 4, stroke: 2 },
    hop: { start: 56, land: 36, arc: 44, dash: '3 6', stroke: 2 },
  },
  ipad: {
    wave: 16,
    waveStroke: 2.5,
    bee: 2.6,
    question: { dx: 50, dy: -18, font: 40 },
    wobble: { left: -37, right: 21, dy: 24, w: 16, h: 5, stroke: 2.5 },
    hop: { start: 56, land: 36, arc: 78, dash: '4 8', stroke: 2.5 },
  },
};

export interface PondBee {
  /** Centre of the bee in the drawing: above stone `stone`, or at `x`. */
  stone?: number;
  x?: number;
  y: number;
  motion?: 'hover' | 'hop' | 'away' | 'still';
  /** The "?" beside it (P2b). */
  question?: boolean;
}

export interface PondStonesProps {
  size: PondSize;
  syllables: readonly SpeakingSyllable[];
  /** Look of each stone (by index). */
  looks: readonly StoneLook[];
  /** Drawing height and where the water starts (the boards: phone 200/150, 170/120, 150/104; iPad 300/222). */
  height: number;
  waterY: number;
  bee?: PondBee | null;
  /** P1: ripple under the big stone and the dashed hop path. */
  ripple?: boolean;
  hopPath?: boolean;
  /** P2: the splash ring under this stone. */
  splashAt?: number | null;
  /** P3: the stones shimmer while the check runs. */
  shimmer?: boolean;
  label: string;
  /** HTML laid over the card ("Big stone = loud part"). */
  children?: React.ReactNode;
  className?: string;
}

export function PondStones({
  size,
  syllables,
  looks,
  height,
  waterY,
  bee,
  ripple = false,
  hopPath = false,
  splashAt = null,
  shimmer = false,
  label,
  children,
  className,
}: PondStonesProps) {
  const width = POND[size].width;
  const s = SIZE[size];
  const stones = layoutStones(syllables, size, waterY);
  const mid = width / 2;
  const wave = `M0 ${waterY} Q ${Math.ceil(width / 4)} ${waterY - s.wave} ${mid} ${waterY} T ${width} ${waterY}`;
  const big = stones.findIndex((x) => x.stressed);
  const beeX = bee
    ? (bee.x ?? stones[Math.max(0, Math.min(bee.stone ?? 0, stones.length - 1))]?.cx ?? mid)
    : 0;

  return (
    <div
      className={gcn(
        'relative overflow-hidden bg-forest',
        size === 'phone' ? 'rounded-[26px]' : 'rounded-[32px]',
        className,
      )}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="block h-auto"
      >
        <path d={`${wave} V${height + 20} H0 Z`} fill="var(--pond-water)" />
        <path d={wave} fill="none" stroke="var(--pond-wave)" strokeWidth={s.waveStroke} />
        {ripple && big >= 0 ? (
          <ellipse
            className="pron-ripple"
            cx={stones[big].cx}
            cy={waterY}
            rx={stones[big].rx + 6}
            ry={14}
            fill="none"
            stroke="var(--pond-ripple)"
            strokeWidth="2"
          />
        ) : null}
        {stones.map((st, k) => {
          const look = looks[k] ?? 'dark';
          const wobbly = look === 'wobbly';
          const k2 = st.rx / POND[size].small.rx;
          const w = s.wobble;
          return (
            <g key={k} data-stone={look}>
              <ellipse
                cx={st.cx}
                cy={st.cy}
                rx={st.rx}
                ry={st.ry}
                fill={FILL[look]}
                transform={wobbly ? `rotate(-8 ${st.cx} ${st.cy})` : undefined}
                className={shimmer ? 'pron-shimmer' : undefined}
                style={shimmer ? { animationDelay: `${k * 0.2}s` } : undefined}
              />
              {splashAt === k ? (
                <ellipse
                  className="pron-splash"
                  cx={st.cx}
                  cy={st.cy + 12}
                  rx={st.rx + 4}
                  ry={st.splashRy}
                  fill="none"
                  stroke="var(--pond-splash)"
                  strokeWidth={s.waveStroke}
                />
              ) : null}
              <text
                x={st.cx}
                y={st.textY}
                textAnchor="middle"
                fontWeight={st.stressed ? 700 : 600}
                fontSize={st.fontSize}
                fill={look === 'dark' ? 'var(--stone-text-light)' : 'var(--color-text)'}
                lang="en"
                className="font-body"
              >
                {st.text}
              </text>
              {wobbly ? (
                <path
                  d={`M${st.cx + w.left * k2} ${st.cy + w.dy} q${w.w / 2} -${w.h} ${w.w} 0 M${st.cx + w.right * k2} ${st.cy + w.dy} q${w.w / 2} -${w.h} ${w.w} 0`}
                  stroke="var(--stone-wobbly)"
                  strokeWidth={w.stroke}
                  fill="none"
                />
              ) : null}
            </g>
          );
        })}
        {hopPath && stones.length > 1 ? (
          <path
            d={stones
              .slice(1)
              .map((b, k) => {
                const a = stones[k];
                const ay = k === 0 ? a.cy - s.hop.start : a.cy - s.hop.land;
                const by = b.cy - s.hop.land;
                const cy = Math.min(ay, by) - s.hop.arc;
                const third = (b.cx - a.cx) / 3;
                return `M${a.cx} ${ay} C ${a.cx + third} ${cy} ${b.cx - third} ${cy} ${b.cx} ${by}`;
              })
              .join(' ')}
            fill="none"
            stroke="var(--pond-path)"
            strokeWidth={s.hop.stroke}
            strokeDasharray={s.hop.dash}
            strokeLinecap="round"
          />
        ) : null}
        {bee ? (
          <>
            <g
              className={
                bee.motion === 'hop'
                  ? 'pron-hop'
                  : bee.motion === 'away'
                    ? 'pron-away'
                    : bee.motion === 'still'
                      ? undefined
                      : 'pron-hover'
              }
            >
              <g transform={`translate(${beeX},${bee.y}) scale(${s.bee})`}>
                <g transform="translate(-16,-17)">
                  <BeeShape />
                </g>
              </g>
            </g>
            {bee.question ? (
              <text
                x={beeX + s.question.dx}
                y={bee.y + s.question.dy}
                fontWeight={600}
                fontSize={s.question.font}
                fill="var(--pond-splash)"
                className="font-display"
                aria-hidden="true"
              >
                ?
              </text>
            ) : null}
          </>
        ) : null}
      </svg>
      {children}
    </div>
  );
}
