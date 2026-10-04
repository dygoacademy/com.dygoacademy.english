import { BEEP_HZ, BEEP_MS, VIBRATE_MS } from './constants';

/**
 * The "go" signal at the end of the SP2 countdown (handover v2 §3.2): a
 * short sine beep through the shared AudioContext and a short vibration.
 * The silent switch can mute the beep on iPhone, and iOS Safari has no
 * `navigator.vibrate`, so the mic turning clay is the signal that always
 * shows. Recording starts BEEP_GUARD_MS after this so the beep isn't in
 * the clip. Never throws: a missing API just means no beep or no buzz.
 */
export function beepAndVibrate(
  ctx: Pick<AudioContext, 'createOscillator' | 'createGain' | 'currentTime' | 'destination'> | null,
  nav: { vibrate?: (pattern: number) => boolean } | undefined = typeof navigator !== 'undefined'
    ? navigator
    : undefined,
): void {
  try {
    if (ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const end = now + BEEP_MS / 1000;
      osc.type = 'sine';
      osc.frequency.value = BEEP_HZ;
      // Short fade in and out so the beep doesn't click.
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(end);
    }
  } catch {
    // no Web Audio: the clay mic is the signal
  }
  try {
    nav?.vibrate?.(VIBRATE_MS);
  } catch {
    // vibration blocked or unsupported
  }
}
