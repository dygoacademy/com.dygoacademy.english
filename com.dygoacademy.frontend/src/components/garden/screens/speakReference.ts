import {
  SPEAK_FIXTURE_ITEM,
  SPEAK_FIXTURE_RESULT_CANVAS,
} from "./speakFixtures";
import type { ShownResult } from "@/lib/speaking/check";
import type { SpeakingSessionItem, SpeakingTimings } from "@/types";

/**
 * Sample data for the speaking reference pages (`/garden/_reference/SP*`,
 * docs/design/garden/README.md): the exact bar shapes, word timings and
 * result the canvas draws (SpeakRecording.dc.html, SpeakCompare.dc.html,
 * handover v2), read from the canvas files so the pixel diff compares like
 * for like. The canvas shapes are made up; live pages use real audio.
 */

/** SP2 pale native shape (72 bars, 0..1). */
export const SPEAK_REF_GHOST: number[] = [
  0.2081, 0.6125, 0.9231, 1.0, 0.7256, 0.4688, 0.4487, 0.4744, 0.235, 0.2394,
  0.545, 0.6006, 0.5575, 0.3081, 0.3638, 0.5456, 0.845, 0.7219, 0.3244, 0.24,
  0.4006, 0.3112, 0.2256, 0.3063, 0.5331, 0.5881, 0.6119, 0.3494, 0.5069,
  0.9512, 1.0, 0.9475, 0.5687, 0.6169, 0.5344, 0.5875, 0.7063, 0.6588, 0.5681,
  0.3144, 0.2125, 0.2594, 0.3106, 0.1569, 0.1869, 0.3619, 0.5, 0.5525, 0.6238,
  0.9563, 0.9619, 0.7131, 0.3175, 0.2469, 0.3312, 0.2231, 0.2413, 0.5413, 0.94,
  0.9275, 0.7438, 0.4862, 0.6075, 0.475, 0.2775, 0.26, 0.6506, 0.9863, 0.6406,
  0.4481, 0.13, 0.0275,
];

/** SP2 learner bars so far (39 of 72) as live mic levels (LiveWaveform's full scale is 0.2). */
export const SPEAK_REF_LIVE: number[] = [
  0.04588, 0.11812, 0.17076, 0.2, 0.11026, 0.11038, 0.12188, 0.0665, 0.04874,
  0.062, 0.08662, 0.11512, 0.09312, 0.05688, 0.09238, 0.12712, 0.1415, 0.08612,
  0.04724, 0.06512, 0.08574, 0.0595, 0.04162, 0.09788, 0.11812, 0.11588,
  0.07724, 0.05338, 0.07238, 0.08838, 0.09188, 0.086, 0.11062, 0.147, 0.10474,
  0.14262, 0.17438, 0.11412, 0.06988,
];

/** SP3 overlay: native and learner (72 bars each, 0..1). */
export const SPEAK_REF_NATIVE: number[] = [
  0.189, 0.6037, 0.9207, 1.0, 0.7195, 0.4561, 0.4354, 0.4622, 0.2171, 0.222,
  0.5341, 0.5915, 0.5476, 0.2927, 0.3488, 0.5354, 0.8415, 0.7146, 0.3085,
  0.2232, 0.3866, 0.2951, 0.2073, 0.2902, 0.522, 0.578, 0.6024, 0.3341, 0.4951,
  0.95, 1.0, 0.9463, 0.5585, 0.6085, 0.5232, 0.578, 0.7, 0.6512, 0.5585, 0.2988,
  0.1939, 0.2427, 0.2951, 0.1366, 0.1683, 0.3463, 0.4878, 0.5427, 0.6146,
  0.9549, 0.961, 0.7061, 0.3012, 0.2293, 0.3159, 0.2049, 0.2244, 0.5305, 0.9378,
  0.9256, 0.7378, 0.4744, 0.5976, 0.4622, 0.261, 0.2427, 0.6427, 0.9854, 0.6329,
  0.4354, 0.1098, 0.0049,
];
export const SPEAK_REF_USER: number[] = [
  0.211, 0.5817, 0.85, 1.0, 0.5402, 0.5415, 0.6, 0.3171, 0.2256, 0.2939, 0.4195,
  0.5659, 0.4524, 0.2671, 0.4488, 0.6268, 0.7, 0.4171, 0.2183, 0.3098, 0.4146,
  0.2817, 0.1902, 0.4768, 0.5805, 0.5695, 0.372, 0.25, 0.3463, 0.4293, 0.4463,
  0.4171, 0.5427, 0.7293, 0.5122, 0.7061, 0.8695, 0.561, 0.3341, 0.0976, 0.0024,
  0.0, 0.028, 0.022, 0.0683, 0.189, 0.4524, 0.6098, 0.4744, 0.5707, 0.772,
  0.7988, 0.3329, 0.1549, 0.2573, 0.3268, 0.1756, 0.3195, 0.7488, 0.7829,
  0.7756, 0.4829, 0.5524, 0.5622, 0.2573, 0.2756, 0.5427, 0.7146, 0.7024, 0.489,
  0.1451, 0.0049,
];

/**
 * Word timings that put SP3's amber bands where the canvas has them
 * ("mitigate" 125.2–178.9, "the" –196.8, "effects" –237.0 of 322) and,
 * at 0:02 into SP2, the follow-along on "mitigate" (1.5× slower).
 * The clip is 3.3 s, the learner 3.4 s ("3.4s · native 3.3s").
 */
export const SPEAK_REF_TIMINGS: SpeakingTimings = {
  duration: 3.3,
  words: [
    {
      text: "Planting",
      start: 0.0,
      end: 0.257,
      syllables: [],
    },
    {
      text: "more",
      start: 0.257,
      end: 0.513,
      syllables: [],
    },
    {
      text: "trees",
      start: 0.513,
      end: 0.77,
      syllables: [],
    },
    {
      text: "can",
      start: 0.77,
      end: 1.026,
      syllables: [],
    },
    {
      text: "help",
      start: 1.026,
      end: 1.283,
      syllables: [],
    },
    {
      text: "mitigate",
      start: 1.283,
      end: 1.833,
      syllables: [
        {
          start: 1.283,
          end: 1.467,
          stressed: true,
        },
        {
          start: 1.467,
          end: 1.65,
          stressed: false,
        },
        {
          start: 1.65,
          end: 1.833,
          stressed: false,
        },
      ],
    },
    {
      text: "the",
      start: 1.833,
      end: 2.017,
      syllables: [],
    },
    {
      text: "effects",
      start: 2.017,
      end: 2.429,
      syllables: [],
    },
    {
      text: "of",
      start: 2.429,
      end: 2.719,
      syllables: [],
    },
    {
      text: "climate",
      start: 2.719,
      end: 3.01,
      syllables: [],
    },
    {
      text: "change.",
      start: 3.01,
      end: 3.3,
      syllables: [],
    },
  ],
};

export const SPEAK_REF_ITEM: SpeakingSessionItem = {
  ...SPEAK_FIXTURE_ITEM,
  timings_uk: SPEAK_REF_TIMINGS,
  timings_us: SPEAK_REF_TIMINGS,
};

export const SPEAK_REF_RESULT: ShownResult = {
  ...SPEAK_FIXTURE_RESULT_CANVAS,
  userDurationMs: 3400,
  envelopes: { native: SPEAK_REF_NATIVE, user: SPEAK_REF_USER },
};

/**
 * SP2's clip is 3.6 s long: at 20 live levels a second that is exactly
 * one level per bar, so SPEAK_REF_LIVE lands bar for bar on the canvas.
 * Same word spans, scaled.
 */
const SP2_SCALE = 3.6 / SPEAK_REF_TIMINGS.duration;
export const SPEAK_REF_ITEM_SP2: SpeakingSessionItem = {
  ...SPEAK_FIXTURE_ITEM,
  timings_uk: scaleTimings(SPEAK_REF_TIMINGS, SP2_SCALE),
  timings_us: scaleTimings(SPEAK_REF_TIMINGS, SP2_SCALE),
};
/** 0:02 on the clock, follow-along on "mitigate" (1.5× slower than 3.6 s). */
export const SPEAK_REF_ELAPSED_MS = 2200;

function scaleTimings(t: SpeakingTimings, k: number): SpeakingTimings {
  const s = (x: number) => Math.round(x * k * 1000) / 1000;
  return {
    duration: s(t.duration),
    words: t.words.map((w) => ({
      ...w,
      start: s(w.start),
      end: s(w.end),
      syllables: w.syllables.map((y) => ({
        ...y,
        start: s(y.start),
        end: s(y.end),
      })),
    })),
  };
}
