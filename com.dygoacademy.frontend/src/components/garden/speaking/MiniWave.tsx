import { toBars, WAVE_COLORS } from './waveformBars';

/** SP4 row waveform (SpeakDone.dc.html): 72×20, 18 green bars. */
export function MiniWave({ levels }: { levels: readonly number[] }) {
  const bars = toBars(levels, 18);
  return (
    <svg width="72" height="20" viewBox="0 0 72 20" aria-hidden="true" className="shrink-0">
      {bars.map((v, i) => {
        const h = 3 + v * 15;
        return (
          <rect
            key={i}
            x={i * 4}
            y={(20 - h) / 2}
            width={2.5}
            height={h}
            rx={1.2}
            fill={WAVE_COLORS.native}
          />
        );
      })}
    </svg>
  );
}
