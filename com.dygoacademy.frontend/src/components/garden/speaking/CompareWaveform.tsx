import { Playhead } from './Playhead';
import { barHeight, barX, toBars, WAVE_BARS, WAVE_COLORS, WAVE_WIDTH } from './waveformBars';

export type CompareView = 'overlay' | 'stacked';

export interface CompareWaveformProps {
  /** Native and learner envelopes (the scorer's, 100 fps); each fills the width. */
  native: readonly number[];
  user: readonly number[];
  view: CompareView;
  /** The target word's span as fractions of the native clip; amber band. */
  target?: { start: number; end: number } | null;
  playingMs?: number | null;
  playKey?: string | number;
  label: string;
}

const H = 104;
const ROW = 48;
const ROW_GAP = 56;

/**
 * SP3 compare waveform (SpeakCompare.dc.html), 322×104. Overlay: pale
 * native bars with thin clay learner bars on top. Side by side: native
 * (green) on top, learner (clay) below. Both views: amber target band.
 */
export function CompareWaveform({
  native,
  user,
  view,
  target,
  playingMs,
  playKey,
  label,
}: CompareWaveformProps) {
  const n = toBars(native, WAVE_BARS);
  const u = toBars(user, WAVE_BARS);
  const band = target ? (
    <rect
      data-testid="wave-target"
      x={target.start * WAVE_WIDTH}
      y={-4}
      width={Math.max(0, (target.end - target.start) * WAVE_WIDTH)}
      height={H + 8}
      rx={8}
      fill={WAVE_COLORS.targetCompare}
      opacity={0.32}
    />
  ) : null;

  const row = (bars: number[], fill: string, key: string) =>
    bars.map((v, i) => {
      const h = barHeight(v, 3, ROW);
      return (
        <rect
          key={`${key}${i}`}
          x={barX(i, 2.7)}
          y={(ROW - h) / 2}
          width={2.7}
          height={h}
          rx={1.3}
          fill={fill}
        />
      );
    });

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WAVE_WIDTH} ${H}`}
      role="img"
      aria-label={label}
      data-view={view}
      className="block h-auto overflow-visible"
    >
      {band}
      {view === 'overlay' ? (
        <>
          {n.map((v, i) => {
            const h = barHeight(v, 5, H - 6);
            return (
              <rect
                key={`n${i}`}
                x={barX(i, 3.2)}
                y={(H - h) / 2}
                width={3.2}
                height={h}
                rx={1.6}
                fill={WAVE_COLORS.nativePale}
              />
            );
          })}
          {u.map((v, i) => {
            const h = barHeight(v, 5, H - 6);
            return (
              <rect
                key={`u${i}`}
                x={barX(i, 1.6)}
                y={(H - h) / 2}
                width={1.6}
                height={h}
                rx={0.8}
                fill={WAVE_COLORS.user}
              />
            );
          })}
        </>
      ) : (
        <>
          <g data-testid="row-native">{row(n, WAVE_COLORS.native, 'n')}</g>
          <g data-testid="row-user" transform={`translate(0,${ROW_GAP})`}>
            {row(u, WAVE_COLORS.user, 'u')}
          </g>
        </>
      )}
      {playingMs ? <Playhead key={playKey} durationMs={playingMs} y={-6} height={H + 12} /> : null}
    </svg>
  );
}
