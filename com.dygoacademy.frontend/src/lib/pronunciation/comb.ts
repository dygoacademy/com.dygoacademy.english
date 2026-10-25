import { PASS_MARK } from './pronunciationResult';

/**
 * The honeycomb board's drawing (honeycomb plan §2.1, boards
 * PronStones*.dc.html): a 334 × 150 viewBox, one pointy-top hexagon per
 * syllable (radius 40, centre y 100) in equal slots, the dashed pass line
 * at the height honey reaches at PASS_MARK.
 */
export const COMB = { width: 334, height: 150, r: 40, cy: 100, beeY: 34 } as const;
/** Half a hexagon's width. */
export const COMB_HW = (COMB.r * Math.sqrt(3)) / 2;
/** The pass line: y = cy + R − 2R × 0.8. */
export const PASS_LINE_Y = COMB.cy + COMB.r - 2 * COMB.r * (PASS_MARK / 100);
/** P2: how high the pale honey fills a reached cell (~62 %). */
export const LIVE_FILL = 0.62;
/** P3: the honey's height while it rises and falls (scaleY .3 ↔ 1 on this). */
export const CHECKING_FILL = 0.72;

const pt = (n: number) => n.toFixed(1);

/** The six points of a pointy-top hexagon. */
export function hexPoints(cx: number, cy: number, r: number): string {
  return [-90, -30, 30, 90, 150, 210]
    .map((a) => {
      const t = (a * Math.PI) / 180;
      return `${pt(cx + r * Math.cos(t))},${pt(cy + r * Math.sin(t))}`;
    })
    .join(' ');
}

export interface CombCell {
  cx: number;
  points: string;
  /** The selected ring, 6 units out. */
  ringPoints: string;
  /** The overlay's place, in % of the board. */
  left: string;
  top: string;
  width: string;
  height: string;
}

/** The cells for `n` syllables (2–4 on the boards; any count works). */
export function combCells(n: number): CombCell[] {
  const slot = COMB.width / Math.max(1, n);
  return Array.from({ length: n }, (_, i) => {
    const cx = +(slot * (i + 0.5)).toFixed(1);
    return {
      cx,
      points: hexPoints(cx, COMB.cy, COMB.r),
      ringPoints: hexPoints(cx, COMB.cy, COMB.r + 6),
      left: `${((cx / COMB.width) * 100).toFixed(2)}%`,
      top: `${((COMB.cy / COMB.height) * 100).toFixed(2)}%`,
      width: `${(((2 * COMB_HW) / COMB.width) * 100).toFixed(2)}%`,
      height: `${(((2 * COMB.r) / COMB.height) * 100).toFixed(2)}%`,
    };
  });
}

/** Where honey filled to `fraction` (0–1) of a cell's height starts (its top y). */
export const honeyTop = (fraction: number) => COMB.cy + COMB.r - 2 * COMB.r * Math.max(0, Math.min(1, fraction));

/** The wavy top of P4's honey in the cell at `cx`, filled to `top`. */
export function honeyWave(cx: number, top: number): string {
  let d = `M${pt(cx - COMB_HW)} ${pt(top + 1)}`;
  for (let k = 0; k <= 8; k++) {
    const x = cx - COMB_HW + (2 * COMB_HW * k) / 8;
    d += ` L${pt(x)} ${pt(top + (k % 2 ? -2.5 : 1.5))}`;
  }
  return `${d} L${pt(cx + COMB_HW)} ${pt(top + 2)} Z`;
}

/** The dashed "hop" path across the cell tops (P1). */
export function hopPath(cells: readonly Pick<CombCell, 'cx'>[]): string {
  const top = COMB.cy - COMB.r - 6;
  return cells
    .slice(1)
    .map((c, k) => {
      const a = cells[k].cx;
      const mid = (a + c.cx) / 2;
      return `M${pt(a)} ${pt(top)} C ${pt(mid - (c.cx - a) * 0.2)} ${pt(top - 32)} ${pt(mid + (c.cx - a) * 0.2)} ${pt(top - 32)} ${pt(c.cx)} ${pt(top)}`;
    })
    .join(' ');
}

/**
 * P2's voice meter (plan §3 P2): 21 mini hexagons (r 9) in two staggered
 * rows across a 200 × 40 box, ramping pale honey → deep amber.
 */
export const METER_HEXES = 21;
const METER_RAMP = ['var(--comb-honey-pale)', 'var(--comb-honey)', 'var(--comb-honey-deep)', 'var(--comb-honey-dark)'];

export function meterHexes(count = METER_HEXES): { points: string; fill: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const cx = 10 + i * 8.9;
    const cy = i % 2 ? 27 : 12;
    return { points: hexPoints(cx, cy, 9.2), fill: METER_RAMP[Math.min(3, Math.floor((i / count) * 4))] };
  });
}
