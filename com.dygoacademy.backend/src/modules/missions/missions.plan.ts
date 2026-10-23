/**
 * Daily goal missions plan (docs/plans/Daily goal missions plan.md): the
 * learner's `daily_goal_minutes` picks a tier, and a time budget sizes the
 * day. Watering is counted first; what's left buys new words (never below
 * PLANT_FLOOR), and a day whose watering alone fills the goal has no Plant
 * mission at all, so reviews can't snowball. Seeds & Harvest: with more
 * than THIRSTY_LIMIT due words a day plants at most THIRSTY_PLANT. Pure, so it is unit tested
 * without a database.
 */

import type { MissionType } from './missions.store';

/** Pace guesses in seconds, to tune from real session times. */
export const PACE = { review: 10, newWord: 40, quizQuestion: 12, speakSentence: 30 } as const;

/** Least new words on a day that isn't a catch-up day. */
export const PLANT_FLOOR = 3;

/**
 * Seeds & Harvest: more than this many words due at the day's first read
 * and the day plants at most THIRSTY_PLANT, so watering never becomes a wall
 * (plan, "Daily planting"; Phase 4 tunes both).
 */
export const THIRSTY_LIMIT = 20;
export const THIRSTY_PLANT = 2;

/** Fewest words with a speaking item for a SPEAK mission. */
export const SPEAK_MIN = 3;

export interface GoalTier {
  minutes: number;
  plant: number;
  quizQuestions: number;
  speak: number;
  /** 'quiz': quiz only; 'alternate': quiz or speak by day; 'both': quiz and speak. */
  practice: 'quiz' | 'alternate' | 'both';
}

export const GOAL_TIERS: readonly GoalTier[] = [
  { minutes: 5, plant: 3, quizQuestions: 5, speak: 3, practice: 'quiz' },
  { minutes: 10, plant: 5, quizQuestions: 10, speak: 3, practice: 'alternate' },
  { minutes: 15, plant: 8, quizQuestions: 10, speak: 5, practice: 'alternate' },
  { minutes: 20, plant: 10, quizQuestions: 10, speak: 5, practice: 'both' },
  { minutes: 30, plant: 15, quizQuestions: 15, speak: 5, practice: 'both' },
];

/** The tier at or below `goalMinutes` (5 for anything smaller). */
export function tierFor(goalMinutes: number | null | undefined): GoalTier {
  const goal = Number.isFinite(goalMinutes) ? Number(goalMinutes) : 10;
  let tier = GOAL_TIERS[0];
  for (const t of GOAL_TIERS) if (goal >= t.minutes) tier = t;
  return tier;
}

export interface DayPlanInput {
  goalMinutes: number | null | undefined;
  /** Words due at the day's first read. */
  dueCount: number;
  /** Words the learner can read that have a speaking item. */
  speakable: number;
  /** Alternate days: SPEAK instead of QUIZ (missions.store `isSpeakDay`). */
  speakDay: boolean;
}

export interface DayPlan {
  missions: Array<{ type: MissionType; target: number }>;
  quizQuestions: number;
  estimateMinutes: number;
}

export function planDay({ goalMinutes, dueCount, speakable, speakDay }: DayPlanInput): DayPlan {
  const tier = tierFor(goalMinutes);
  const budget = tier.minutes * 60;
  const due = Math.max(0, dueCount);

  const speakTarget = Math.min(tier.speak, speakable);
  const canSpeak = speakTarget >= SPEAK_MIN;
  const practice: Array<{ type: MissionType; target: number }> = [];
  let practiceSeconds = 0;
  const addQuiz = () => {
    practice.push({ type: 'QUIZ', target: 1 });
    practiceSeconds += tier.quizQuestions * PACE.quizQuestion;
  };
  const addSpeak = () => {
    practice.push({ type: 'SPEAK', target: speakTarget });
    practiceSeconds += speakTarget * PACE.speakSentence;
  };
  if (tier.practice === 'both') {
    addQuiz();
    if (canSpeak) addSpeak();
  } else if (tier.practice === 'alternate' && speakDay && canSpeak) {
    addSpeak();
  } else {
    addQuiz();
  }

  const waterSeconds = due * PACE.review;
  let plant = 0;
  if (waterSeconds < budget) {
    const left = Math.floor((budget - waterSeconds - practiceSeconds) / PACE.newWord);
    plant = Math.min(tier.plant, Math.max(PLANT_FLOOR, left));
    if (due > THIRSTY_LIMIT) plant = Math.min(plant, THIRSTY_PLANT);
  }

  const missions: Array<{ type: MissionType; target: number }> = [
    { type: 'REVIEW_DUE', target: due },
    ...(plant > 0 ? [{ type: 'LEARN_NEW' as MissionType, target: plant }] : []),
    ...practice,
  ];
  const seconds = waterSeconds + plant * PACE.newWord + practiceSeconds;
  return {
    missions,
    quizQuestions: tier.quizQuestions,
    estimateMinutes: Math.max(1, Math.ceil(seconds / 60)),
  };
}
