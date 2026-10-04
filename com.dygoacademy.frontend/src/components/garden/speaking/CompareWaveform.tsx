import { Playhead } from './Playhead';
import { barHeight, barX, toBars, WAVE_BARS, WAVE_COLORS, WAVE_WIDTH } from './waveformBars';

export type CompareView = 'overlay' | 'stacked';

/** An amber band over a word that needs work, as fractions of the native clip. */
export interface CompareBand {
  start: number;
  end: number;
  /** The target word: stronger amber (canvas opacity .32; other words .18). */
  target: boolean;
}

export interface CompareWaveformProps {
  /** Native and learner envelopes (100 fps); each fills the width. */
  native: readonly number[];
  user: readonly number[];
  view: CompareView;
  /** Words that need work; none while checking (handover v2 SP3). */
  bands?: readonly CompareBand[];
  playingMs?: number | null;
  playKey?: string | number;
  label: string;
}

/** Measured from SpeakCompare.dc.html (handover v2, 2026-10-04). */
const H = 92;
const OVERLAY_MIN = 4;
const OVERLAY_MAX = H - 6;
const ROW = 42;
const ROW_MIN = 3;
const ROW_MAX = ROW - 6;
const ROW_GAP = 50;

/**
 * SP3 compare waveform (SpeakCompare.dc.html), 322×92. Overlay: pale
 * native bars with thin clay learner bars on top. Side by side: native
 * (green) on top, learner (clay) below. Amber bands mark the words that
 * need work once the check is done.
 */
export function CompareWaveform({
  native,
  user,
  view,
  bands = [],
  playingMs,
  playKey,
  label,
}: CompareWaveformProps) {
  const n = toBars(native, WAVE_BARS);
  const u = toBars(user, WAVE_BARS);

  const row = (bars: number[], fill: string, key: string) =>
    bars.map((v, i) => {
      const h = barHeight(v, ROW_MIN, ROW_MAX);
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
      {bands.map((b, i) => (
        <rect
          key={`b${i}`}
          data-testid={b.target ? 'wave-target' : 'wave-band'}
          x={b.start * WAVE_WIDTH}
          y={-4}
          width={Math.max(0, (b.end - b.start) * WAVE_WIDTH)}
          height={H + 8}
          rx={8}
          fill={WAVE_COLORS.targetCompare}
          opacity={b.target ? 0.32 : 0.18}
        />
      ))}
      {view === 'overlay' ? (
        <>
          {n.map((v, i) => {
            const h = barHeight(v, OVERLAY_MIN, OVERLAY_MAX);
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
            const h = barHeight(v, OVERLAY_MIN, OVERLAY_MAX);
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
