import { WAVE_COLORS, WAVE_WIDTH } from './waveformBars';

/**
 * The "playing" sweep from the design files: a pale wash grows over the
 * played part while a thin head moves across, once, over `durationMs`.
 * Re-mount it (change `key`) to restart. Hidden with reduced motion.
 */
const CSS = `
@keyframes dygo-wave-sweep { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes dygo-wave-head { from { transform: translateX(0) } to { transform: translateX(${WAVE_WIDTH}px) } }
.dygo-wave-sweep { transform-origin: 0 0; animation: dygo-wave-sweep linear forwards }
.dygo-wave-head { animation: dygo-wave-head linear forwards }
@media (prefers-reduced-motion: reduce) { .dygo-wave-sweep, .dygo-wave-head { display: none } }
`;

export function Playhead({
  durationMs,
  y,
  height,
  wash = 0.5,
}: {
  durationMs: number;
  y: number;
  height: number;
  wash?: number;
}) {
  const style = { animationDuration: `${Math.max(1, durationMs)}ms` };
  return (
    <g data-testid="wave-playhead">
      <style>{CSS}</style>
      <rect
        className="dygo-wave-sweep"
        style={style}
        x={0}
        y={y}
        width={WAVE_WIDTH}
        height={height}
        fill="#FFFFFF"
        opacity={wash}
      />
      <rect
        className="dygo-wave-head"
        style={style}
        x={0}
        y={y}
        width={2}
        height={height}
        fill={WAVE_COLORS.head}
      />
    </g>
  );
}
