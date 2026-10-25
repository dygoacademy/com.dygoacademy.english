import { stoneText } from '@/lib/speaking/ipa';
import type { SpeakingSyllable } from '@/types';

import type { Msg } from './pronunciationResult';

/**
 * The P1 tip from the syllables (honeycomb plan §3 P1): the stressed one is
 * "loud", the next one "light", in the word's order.
 *
 * - stress first, more after: "say MI loud, ti light, then gate." (`p1.tip`)
 * - stress first, one after:  "say SUN loud, then ny light."     (`p1.tipTwo`)
 * - stress later, more after: "say com pen light, SA loud, then tion." (`p1.tipLate`)
 * - stress last:              "say com pen light, then SA loud."  (`p1.tipLateEnd`)
 *
 * The parts are plain text joined by spaces; the screen bolds `loud`,
 * `light` and `rest`. One syllable: `p1.tipOne` ("say SUN loud.").
 */
export function p1Tip(syllables: readonly SpeakingSyllable[]): Msg {
  const parts = syllables.map(stoneText);
  if (parts.length === 0) return { key: 'p1.tipOne', values: { loud: '' } };
  const s = Math.max(0, syllables.findIndex((x) => x.stressed));
  const loud = parts[s];
  const join = (xs: string[]) => xs.join(' ');
  if (parts.length === 1) return { key: 'p1.tipOne', values: { loud } };
  if (s === 0) {
    const [light, ...rest] = parts.slice(1);
    return rest.length
      ? { key: 'p1.tip', values: { loud, light, rest: join(rest) } }
      : { key: 'p1.tipTwo', values: { loud, light } };
  }
  const light = join(parts.slice(0, s));
  const rest = parts.slice(s + 1);
  return rest.length
    ? { key: 'p1.tipLate', values: { loud, light, rest: join(rest) } }
    : { key: 'p1.tipLateEnd', values: { loud, light } };
}
