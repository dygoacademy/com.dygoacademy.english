import * as React from 'react';

import type { StoneState } from '@/lib/speaking/pron-config';
import { layoutResultStones, RESULT_POND } from '@/lib/speaking/pronounce';
import type { SpeakingSyllable } from '@/types';

import { BeeShape } from '../Bee';

/**
 * The P4 v2 stones (PronStonesResult.dc.html, 2026-10-25): the water and
 * one stone per stored syllable, the stressed one big, its text on it.
 * Every value is the board's:
 *
 * - clean: green #9CC39A (`--stone-ok`);
 * - close: pale #C8DDB8 (`--stone-close`) with an amber #E0B04A dashed edge
 *   (2.5, "5 4");
 * - wobbly: clay #E8A87C (`--stone-wobbly`), tilted −8°, its text too;
 * - selected: an amber #F2D28B ring (3) that breathes (`.pron-selected`).
 *
 * The bee sits over the first stone on a retry and flies off on a pass.
 * The chips under the stones are the screen's (Step B).
 */
export interface ResultStonesProps {
  syllables: readonly SpeakingSyllable[];
  states: readonly StoneState[];
  /** The selected stone, or -1. */
  selected: number;
  /** retry: the bee waits on the first stone; pass: it flies away. */
  bee: 'retry' | 'pass' | null;
  label: string;
}

const FILL: Record<StoneState, string> = {
  clean: 'var(--stone-ok)',
  close: 'var(--stone-close)',
  wobbly: 'var(--stone-wobbly)',
};

export function ResultStones({ syllables, states, selected, bee, label }: ResultStonesProps) {
  const { width, height, waterY } = RESULT_POND;
  const stones = layoutResultStones(syllables);
  const wave = `M0 ${waterY} Q ${Math.ceil(width / 4)} ${waterY - 10} ${width / 2} ${waterY} T ${width} ${waterY}`;
  const beeX = bee === 'pass' ? width / 2 : (stones[0]?.cx ?? width / 2);
  const beeDrawing = (
    <g transform={`translate(${beeX},22)`}>
      <g transform="translate(0,10) scale(1.6)">
        <g transform="translate(-16,-17)">
          <BeeShape />
        </g>
      </g>
    </g>
  );
  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block h-auto">
        <path d={`${wave} V${height} H0 Z`} fill="var(--pond-water)" />
        <path d={wave} fill="none" stroke="var(--pond-wave)" strokeWidth="2" />
        {stones.map((st, k) => {
          const state = states[k] ?? 'clean';
          return (
            <g key={k} data-stone={state} data-selected={k === selected || undefined}>
              {k === selected ? (
                <ellipse
                  className="pron-selected"
                  cx={st.cx}
                  cy={st.cy}
                  rx={st.ringRx}
                  ry={st.ringRy}
                  fill="none"
                  stroke="var(--stone-selected)"
                  strokeWidth="3"
                />
              ) : null}
              <g transform={state === 'wobbly' ? `rotate(-8 ${st.cx} ${st.cy})` : undefined}>
                <ellipse
                  cx={st.cx}
                  cy={st.cy}
                  rx={st.rx}
                  ry={st.ry}
                  fill={FILL[state]}
                  stroke={state === 'close' ? 'var(--stone-close-edge)' : 'none'}
                  strokeWidth="2.5"
                  strokeDasharray={state === 'close' ? '5 4' : undefined}
                />
              </g>
            </g>
          );
        })}
        {bee === 'retry' ? beeDrawing : null}
        {bee === 'pass' ? <g className="pron-away">{beeDrawing}</g> : null}
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {stones.map((st, k) => (
          <span
            key={k}
            lang="en"
            className="absolute whitespace-nowrap font-body font-bold leading-none text-text"
            style={{
              left: st.left,
              top: st.top,
              fontSize: `${st.fontPx}px`,
              transform:
                states[k] === 'wobbly' ? 'translate(-50%, -50%) rotate(-8deg)' : 'translate(-50%, -50%)',
            }}
          >
            {st.text}
          </span>
        ))}
      </div>
    </div>
  );
}
