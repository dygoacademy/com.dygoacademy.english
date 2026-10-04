import { Playhead } from './Playhead';
import { barHeight, barX, toBars, WAVE_BARS, WAVE_COLORS, WAVE_WIDTH } from './waveformBars';

export interface WaveformProps {
  /** The native clip's envelope (any length; bucketed into 72 bars). */
  levels: readonly number[];
  /** The target word's span as fractions of the clip; tinted. */
  target?: { start: number; end: number } | null;
  /** Show the playing sweep for a clip this long (ms). */
  playingMs?: number | null;
  /** Restarts the sweep when it changes (e.g. a play counter). */
  playKey?: string | number;
  /** Accessible description (from t()). */
  label: string;
}

const H = 76;
const BAR_W = 2.8;

/** SP1 native-speaker waveform (SpeakListen.dc.html): 322×76, solid green bars, tinted target band. */
export function Waveform({ levels, target, playingMs, playKey, label }: WaveformProps) {
  const bars = toBars(levels, WAVE_BARS);
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WAVE_WIDTH} ${H}`}
      role="img"
      aria-label={label}
      className="block h-auto overflow-visible"
    >
      <line x1={0} y1={H / 2} x2={WAVE_WIDTH} y2={H / 2} stroke={WAVE_COLORS.midline} />
      {target && (
        <rect
          data-testid="wave-target"
          x={target.start * WAVE_WIDTH}
          y={0}
          width={Math.max(0, (target.end - target.start) * WAVE_WIDTH)}
          height={H}
          rx={6}
          fill={WAVE_COLORS.targetListen}
          opacity={0.6}
        />
      )}
      {bars.map((v, i) => {
        const h = barHeight(v, 3.6, H - 6);
        return (
          <rect
            key={i}
            x={barX(i, BAR_W)}
            y={(H - h) / 2}
            width={BAR_W}
            height={h}
            rx={BAR_W / 2}
            fill={WAVE_COLORS.native}
          />
        );
      })}
      {playingMs ? (
        <Playhead key={playKey} durationMs={playingMs} y={0} height={H} wash={0.55} />
      ) : null}
    </svg>
  );
}
