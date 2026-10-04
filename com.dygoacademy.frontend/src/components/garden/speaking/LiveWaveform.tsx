import { barHeight, barX, toBars, WAVE_BARS, WAVE_COLORS, WAVE_WIDTH } from './waveformBars';
import { LIVE_LEVELS_PER_SECOND } from '@/hooks/useLiveLevels';

export interface LiveWaveformProps {
  /** The native clip's envelope, drawn pale behind. */
  nativeLevels: readonly number[];
  /** Native clip length (s): sets how far along the learner's bars reach. */
  nativeDuration: number;
  /** Live mic levels from useLiveLevels (LIVE_LEVELS_PER_SECOND a second). */
  liveLevels: readonly number[];
  /** Opacity of the pale native shape: .45 while recording, .3 behind the countdown (canvas). */
  ghostOpacity?: number;
  /** Accessible name; omit to hide the drawing (the countdown button names itself). */
  label?: string;
}

const H = 170;
const BAR_W = 2.8;
/** Live RMS that fills the bar height; louder is capped. Quieter mics still show a shape. */
const LIVE_FULL_SCALE = 0.2;

/**
 * Learner bars on the native timeline: one bar per 1/72 of the native
 * clip, each the mean live level over that time. A learner slower than
 * the native speaker runs off the end (capped at 72 bars).
 */
export function liveBars(liveLevels: readonly number[], nativeDuration: number): number[] {
  if (nativeDuration <= 0 || liveLevels.length === 0) return [];
  const perBar = (nativeDuration / WAVE_BARS) * LIVE_LEVELS_PER_SECOND; // live levels per bar
  const count = Math.min(WAVE_BARS, Math.floor(liveLevels.length / perBar));
  const out: number[] = [];
  for (let b = 0; b < count; b++) {
    const from = Math.floor(b * perBar);
    const to = Math.max(from + 1, Math.floor((b + 1) * perBar));
    let sum = 0;
    for (let k = from; k < to; k++) sum += liveLevels[k] ?? 0;
    out.push(Math.min(1, sum / (to - from) / LIVE_FULL_SCALE));
  }
  return out;
}

/** SP2 live waveform (SpeakRecording.dc.html): 322×170, pale native shape, clay bars growing left to right. */
export function LiveWaveform({
  nativeLevels,
  nativeDuration,
  liveLevels,
  ghostOpacity = 0.45,
  label,
}: LiveWaveformProps) {
  const native = toBars(nativeLevels, WAVE_BARS);
  const user = liveBars(liveLevels, nativeDuration);
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WAVE_WIDTH} ${H}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="block h-auto"
    >
      <line x1={0} y1={H / 2} x2={WAVE_WIDTH} y2={H / 2} stroke={WAVE_COLORS.midline} />
      {native.map((v, i) => {
        const h = barHeight(v, 4, H - 6);
        return (
          <rect
            key={`n${i}`}
            opacity={ghostOpacity}
            x={barX(i, BAR_W)}
            y={(H - h) / 2}
            width={BAR_W}
            height={h}
            rx={BAR_W / 2}
            fill={WAVE_COLORS.nativePale}
          />
        );
      })}
      {user.map((v, i) => {
        const h = barHeight(v, 4, H - 6);
        return (
          <rect
            key={`u${i}`}
            data-testid="live-bar"
            x={barX(i, BAR_W)}
            y={(H - h) / 2}
            width={BAR_W}
            height={h}
            rx={BAR_W / 2}
            fill={WAVE_COLORS.user}
          />
        );
      })}
    </svg>
  );
}
