'use client';

import * as React from 'react';

import {
  CHECKING_FILL,
  COMB,
  COMB_HW,
  combCells,
  honeyTop,
  honeyWave,
  hopPath,
  LIVE_FILL,
  PASS_LINE_Y,
  type CombCell,
} from '@/lib/pronunciation/comb';
import type { SyllableStatus } from '@/lib/speaking/pron-config';
import { stoneText } from '@/lib/speaking/ipa';
import type { SpeakingSyllable } from '@/types';

import { BeeShape } from '../Bee';
import { gcn } from '../cn';

/**
 * The honeycomb board (honeycomb plan §2.1, boards PronStones*.dc.html):
 * the forest card with a title and the "Pass line 80%" legend, one
 * hexagon per syllable, the dashed pass line, the A7 bee. One component,
 * five modes:
 *
 * - `empty` (P1): cream cells, the bee over cell 1 and the hop path.
 * - `live` (P2): pale honey in each cell the voice has reached (`reached`),
 *   the current one bubbling, the bee hopping over it. Never a score.
 * - `checking` (P3): honey rises and falls, staggered; the bee in the middle.
 * - `dim` (P2b): dark cells, the bee over cell 1 with a gold "?".
 * - `result` (P4): honey to each score with a wavy top, a button per cell
 *   (`result`), the selected ring, the bee on the selected cell (it flies
 *   away when nothing is selected) and the detail strip under the board.
 *
 * Text sits in an HTML overlay positioned in %, so it stays crisp and
 * translatable. Animations are `.comb-*` (globals.css), still under reduced
 * motion. Clip-path ids come from `useId`, so two boards never clash.
 */
export type CombMode = 'empty' | 'live' | 'checking' | 'dim' | 'result';

export interface CombResultCell {
  score: number;
  status: SyllableStatus;
  /** "ti: 56% match with native, below the pass line. Show details." */
  aria: string;
}

export interface CombDetail {
  tag: string;
  tone: SyllableStatus | 'all';
  text: string;
}

export interface HoneycombBoardProps {
  mode: CombMode;
  syllables: readonly SpeakingSyllable[];
  title: string;
  /** "Pass line 80%". */
  passLine: string;
  /** The board's description for screen readers (`role="img"`). */
  label: string;
  /** `live`: cells the voice has reached so far. */
  reached?: number;
  /** `result`: one entry per syllable, the selected cell, and the strip. */
  result?: {
    cells: readonly CombResultCell[];
    selected: number;
    onSelect: (index: number) => void;
    detail: CombDetail;
  };
  className?: string;
}

const HONEY: Record<SyllableStatus, string> = {
  pass: 'var(--comb-honey)',
  close: 'var(--comb-honey)',
  fail: 'var(--comb-honey-fail)',
};
const MARK: Record<SyllableStatus, string> = {
  pass: 'var(--comb-ok)',
  close: 'var(--comb-close)',
  fail: 'var(--comb-fail)',
};
const TAG: Record<CombDetail['tone'], string> = {
  pass: 'var(--comb-tag-ok)',
  all: 'var(--comb-tag-ok)',
  close: 'var(--comb-honey-pale)',
  fail: 'var(--comb-honey-fail)',
};

/** The A7 bee at the boards' scale (1.15), centred on (x, COMB.beeY). */
export function BeeMarker({
  x,
  motion,
  question = false,
}: {
  x: number;
  motion: 'hover' | 'hop' | 'away' | 'still';
  question?: boolean;
}) {
  const bee = (
    <g transform="scale(1.15)">
      <g transform="translate(-16,-17)">
        <BeeShape />
      </g>
    </g>
  );
  return (
    <g data-bee={motion}>
      {motion === 'away' ? (
        <g className="comb-away">
          <g transform={`translate(${x},${COMB.beeY})`}>{bee}</g>
        </g>
      ) : (
        <g transform={`translate(${x},${COMB.beeY})`}>
          <g className={motion === 'hover' ? 'comb-hover' : motion === 'hop' ? 'comb-hop' : undefined}>{bee}</g>
        </g>
      )}
      {question ? (
        <text
          x={x + 26.3}
          y={26}
          fontFamily="Fraunces, serif"
          fontWeight={600}
          fontSize={22}
          fill="var(--comb-honey-pale)"
          aria-hidden="true"
        >
          {'?'}
        </text>
      ) : null}
    </g>
  );
}

/** The legend: a dashed swatch and "Pass line 80%". */
export function PassLineLegend({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-bold text-[var(--comb-honey-pale)]">
      <svg width="22" height="4" viewBox="0 0 22 4" aria-hidden="true">
        <path d="M0 2 H22" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
      {label}
    </span>
  );
}

/** P4's strip under the board: a tag (Pass / Close / Not yet / All pass) and one sentence. */
export function SyllableDetail({ detail }: { detail: CombDetail }) {
  return (
    <div
      aria-live="polite"
      data-detail={detail.tone}
      className="mx-3 mb-3 flex items-center gap-2.5 rounded-[14px] bg-[var(--comb-deep)] px-3 py-2.5"
    >
      <span
        className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-extrabold uppercase tracking-[.04em] text-[var(--color-text)]"
        style={{ background: TAG[detail.tone] }}
      >
        {detail.tag}
      </span>
      <span className="text-[13px] leading-[1.35] text-[var(--comb-title)]">{detail.text}</span>
    </div>
  );
}

const Tick = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5 L10 17.5 L19 7" />
  </svg>
);
const Cross = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6 L18 18" />
    <path d="M18 6 L6 18" />
  </svg>
);

export function HoneycombBoard({
  mode,
  syllables,
  title,
  passLine,
  label,
  reached = 0,
  result,
  className,
}: HoneycombBoardProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const cells = combCells(syllables.length);
  const dim = mode === 'dim';
  const selected = mode === 'result' ? (result?.selected ?? -1) : -1;

  const honey = (c: CombCell, i: number) => {
    const x = c.cx - COMB_HW;
    const w = 2 * COMB_HW;
    if (mode === 'live' && i < reached) {
      const top = honeyTop(LIVE_FILL);
      return (
        <rect
          className={i === reached - 1 ? 'comb-bubble' : undefined}
          x={x}
          y={top}
          width={w}
          height={COMB.cy + COMB.r - top}
          fill="var(--comb-honey-pale)"
        />
      );
    }
    if (mode === 'checking') {
      const top = honeyTop(CHECKING_FILL);
      return (
        <rect
          className="comb-rise"
          style={{ animationDelay: `${(i * 0.25).toFixed(2)}s` }}
          x={x}
          y={top}
          width={w}
          height={COMB.cy + COMB.r - top}
          fill="var(--comb-honey)"
        />
      );
    }
    const cell = mode === 'result' ? result?.cells[i] : undefined;
    if (cell) {
      const top = honeyTop(cell.score / 100);
      return (
        <>
          <rect x={x} y={top} width={w} height={COMB.cy + COMB.r - top} fill={HONEY[cell.status]} />
          <path d={honeyWave(c.cx, top)} fill={HONEY[cell.status]} />
        </>
      );
    }
    return null;
  };

  const bee =
    mode === 'empty' ? (
      <BeeMarker x={cells[0]?.cx ?? COMB.width / 2} motion="hover" />
    ) : mode === 'live' ? (
      <BeeMarker x={cells[Math.max(0, reached - 1)]?.cx ?? COMB.width / 2} motion={reached > 0 ? 'hop' : 'hover'} />
    ) : mode === 'checking' ? (
      <BeeMarker x={COMB.width / 2} motion="hover" />
    ) : dim ? (
      <BeeMarker x={cells[0]?.cx ?? COMB.width / 2} motion="still" question />
    ) : selected >= 0 ? (
      <BeeMarker x={cells[selected].cx} motion="hover" />
    ) : (
      <BeeMarker x={COMB.width / 2} motion="away" />
    );

  return (
    <div
      data-comb={mode}
      className={gcn('flex flex-col overflow-hidden rounded-[26px] bg-[var(--comb-board)]', className)}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-[var(--comb-title)]">{title}</span>
        <PassLineLegend label={passLine} />
      </div>
      <div className="relative">
        <svg
          width="100%"
          viewBox={`0 0 ${COMB.width} ${COMB.height}`}
          role="img"
          aria-label={label}
          className="block h-auto"
        >
          <defs>
            {cells.map((c, i) => (
              <clipPath key={i} id={`${uid}hx${i}`}>
                <polygon points={c.points} />
              </clipPath>
            ))}
          </defs>
          {cells.map((c, i) => {
            const cell = mode === 'result' ? result?.cells[i] : undefined;
            const close = cell?.status === 'close';
            return (
              <g key={i}>
                <polygon points={c.points} fill={dim ? 'var(--comb-edge)' : 'var(--comb-cell)'} />
                <g clipPath={`url(#${uid}hx${i})`}>{honey(c, i)}</g>
                {i === selected ? (
                  <polygon
                    className="comb-ring"
                    data-selected-ring=""
                    points={c.ringPoints}
                    fill="none"
                    stroke="var(--comb-honey-pale)"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />
                ) : null}
                <polygon
                  points={c.points}
                  fill="none"
                  stroke={dim ? 'var(--comb-dim-edge)' : close ? 'var(--comb-close-edge)' : 'var(--comb-edge)'}
                  strokeWidth="2.5"
                  strokeDasharray={close ? '5 4' : undefined}
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          <path
            d={`M0 ${PASS_LINE_Y} H${COMB.width}`}
            stroke="var(--comb-honey-pale)"
            strokeWidth="2"
            strokeDasharray="5 4"
            opacity=".95"
            data-pass-line={PASS_LINE_Y}
          />
          {mode === 'empty' ? (
            <path
              d={hopPath(cells)}
              fill="none"
              stroke="var(--comb-hop)"
              strokeWidth="2"
              strokeDasharray="3 6"
              strokeLinecap="round"
            />
          ) : null}
          {bee}
        </svg>
        {mode === 'result' && result ? (
          <div className="absolute inset-0">
            {cells.map((c, i) => {
              const cell = result.cells[i];
              const s = syllables[i];
              if (!cell || !s) return null;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={cell.aria}
                  aria-pressed={i === selected}
                  data-cell={cell.status}
                  onClick={() => result.onSelect(i)}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-[30px] bg-transparent p-0 text-[var(--color-text)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--comb-close-edge)]"
                  style={{ left: c.left, top: c.top, width: c.width, height: c.height }}
                >
                  <span lang="en" className={gcn('font-extrabold leading-none', s.stressed ? 'text-[21px]' : 'text-[16px]')}>
                    {stoneText(s)}
                  </span>
                  <span className="text-[13px] font-extrabold leading-none">{`${cell.score}%`}</span>
                  <span
                    aria-hidden="true"
                    className="absolute right-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-[0_0_0_2px_var(--comb-board)]"
                    style={{ background: MARK[cell.status] }}
                  >
                    {cell.status === 'fail' ? <Cross /> : <Tick />}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {cells.map((c, i) => {
              const s = syllables[i];
              return s ? (
                <span
                  key={i}
                  lang="en"
                  className={gcn(
                    'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-extrabold leading-none',
                    s.stressed ? 'text-[21px]' : 'text-[16px]',
                    dim ? 'text-[var(--comb-title)]' : 'text-[var(--color-text)]',
                  )}
                  style={{ left: c.left, top: c.top }}
                >
                  {stoneText(s)}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
      {mode === 'result' && result ? <SyllableDetail detail={result.detail} /> : null}
    </div>
  );
}
