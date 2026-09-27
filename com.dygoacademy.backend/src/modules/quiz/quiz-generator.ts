/**
 * Module 5 — Dynamic Multi-Modal Quiz Engine (FR-5.1–5.4), pure functions
 * only. Same split as `fsrs-scheduler.ts` and `GeminiEnrichmentService.pcmToWav`:
 * no DB/AI access here, so the generation and grading logic can be unit
 * tested without a database or a Gemini call. `QuizService` owns I/O.
 *
 * ---
 *
 * ## Design decisions made here (none of these are pinned by the BRD)
 *
 * **No persisted quiz/session/attempt row.** Checked
 * `dygo_academy_database_dictionary.md` — no such table exists, and
 * `StartSessionDto`'s own precedent (Module 3/4, Phase 2) already treats
 * "which cards, in what shape" as something that can be recomputed rather
 * than stored. Applied the same idea here, one step further: a quiz item's
 * **id is deterministic** — `` `${topicWordId}:${type}` `` — and its correct
 * answer is *derived*, not stored, by always picking the same source field
 * (first example sentence, first synonym, etc.) for a given word+type. That
 * means `POST /quizzes/:id/answer` can re-derive the exact question that was
 * asked and grade it correctly without a database row remembering what
 * `POST /quizzes/generate` handed out earlier — only the *distractor* options
 * differ run to run (fine, since grading never looks at them).
 *
 * **FR-5.3 "Synonym & Antonym Matching" implemented as one-word-at-a-time
 * multiple choice**, not a multi-pair drag-and-drop board. The BRD's "drag-
 * and-drop semantic pairing" describes a UI interaction, not a grading
 * contract; a single-item "which of these words is a synonym of X"
 * question tests the identical FR-5.3 knowledge (semantic relationships)
 * while staying gradable with the same stateless answer/grade shape as the
 * other three types. A future pass building the literal drag-and-drop board
 * can still call this function once per pair. Flagged here and in the API
 * surface doc rather than silently picked, same as the Module 4 clue-ladder
 * disagreement.
 *
 * **CLOZE and CONTEXTUAL_CHOICE both mask the word in an example sentence**,
 * using the exact same case-insensitive, non-word-boundary `replace` regex
 * `maskForReverse` in the frontend's `/study` page already uses for Reverse
 * mode — so a word that fails to mask (doesn't literally appear in its own
 * example sentence, e.g. an inflected form) fails the same way in both
 * places rather than two different masking behaviors existing side by side.
 * Here, an unmasked sentence means the item is skipped (`null`) rather than
 * silently shown with the answer visible.
 *
 * **Distractors are not required to be deterministic.** Only the *correct*
 * answer needs to survive a generate → answer round trip; the wrong options
 * shown are cosmetic and can reshuffle every call. Chosen via `pickDistractors`,
 * which excludes the correct answer and the target word itself, then takes
 * the first `count` entries from whatever pool the caller passes in — the
 * caller (`QuizService`) is responsible for shuffling/sampling that pool
 * before calling in, so this function stays pure and testable with a fixed
 * pool.
 */

export const QUIZ_TYPES = ['CLOZE', 'DICTATION', 'MATCHING', 'CONTEXTUAL_CHOICE'] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

export const MIN_DISTRACTORS = 3;

export interface QuizSourceWord {
  topicWordId: string;
  topicId: string;
  sourceWord: string;
  audioUrl: string | null;
  ipaUs: string | null;
  definition: string | null;
  synonyms: Array<{ word: string; level: string }>;
  antonyms: Array<{ word: string; level: string }>;
  exampleSentences: Array<{ sentence: string; level: string; translation_hint: string }>;
}

export interface QuizItem {
  /** `${topicWordId}:${type}` — deterministic, no persisted row backs it. */
  id: string;
  type: QuizType;
  topicWordId: string;
  topicId: string;
  prompt: string;
  audioUrl?: string | null;
  /** Only present for CHOICE-mode items (MATCHING, CONTEXTUAL_CHOICE). */
  options?: string[];
  answerMode: 'TEXT' | 'CHOICE';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Mirrors the frontend's `maskForReverse` exactly — see module doc. */
function maskWordInSentence(sentence: string, word: string): string | null {
  const pattern = new RegExp(escapeRegExp(word), 'gi');
  if (!pattern.test(sentence)) return null;
  return sentence.replace(new RegExp(escapeRegExp(word), 'gi'), '_____');
}

/**
 * The single source of truth for "what is the right answer to word+type" —
 * called by both `buildQuizItem` (to build the prompt) and `QuizService`
 * (to grade a submission), so the two can never disagree.
 */
export function deriveCorrectAnswer(
  word: QuizSourceWord,
  type: QuizType,
): { answer: string; maskedSentence?: string } | null {
  switch (type) {
    case 'DICTATION':
      return word.audioUrl ? { answer: word.sourceWord } : null;

    case 'CLOZE':
    case 'CONTEXTUAL_CHOICE': {
      const example = word.exampleSentences[0];
      if (!example) return null;
      const masked = maskWordInSentence(example.sentence, word.sourceWord);
      if (!masked) return null;
      return { answer: word.sourceWord, maskedSentence: masked };
    }

    case 'MATCHING': {
      const synonym = word.synonyms[0]?.word;
      if (synonym) return { answer: synonym };
      const antonym = word.antonyms[0]?.word;
      if (antonym) return { answer: antonym };
      return null;
    }
  }
}

/** True for MATCHING and CONTEXTUAL_CHOICE — the two types needing distractor options. */
export function isChoiceType(type: QuizType): boolean {
  return type === 'MATCHING' || type === 'CONTEXTUAL_CHOICE';
}

/**
 * FR-5.x follow-up (live-requested 2026-09-16, "when I do the fill in
 * blank I don't know which word should be fill in ... some suggestion
 * like IPA and explain meaning"). A TEXT-mode item (CLOZE, DICTATION) has
 * no options list to fall back on the way CHOICE items do, so a student
 * who's drawn a blank has nothing else on screen to work from. Kept as a
 * separate on-demand pull (`GET /quizzes/:id/hint`, `QuizService.hint`)
 * rather than folded into the initial `QuizItem` payload every quiz item
 * already gets — same reasoning as `correctAnswer` never being sent until
 * `/answer`: a hint a student didn't ask for yet shouldn't already be
 * sitting in the network response for a quick peek. Pure passthrough today
 * (no gating by type) since the frontend only offers the "Need a hint?"
 * control on TEXT-mode items in the first place; kept here rather than
 * inlined in the service so it stays unit-testable alongside the rest of
 * this file's pure functions.
 */
export interface QuizHint {
  ipaUs: string | null;
  definition: string | null;
}

export function deriveHint(word: QuizSourceWord): QuizHint {
  return { ipaUs: word.ipaUs, definition: word.definition };
}

/**
 * Filters `pool` down to `count` usable distractors: excludes the correct
 * answer and the target word itself (case-insensitive), dedupes, then takes
 * the first `count`. Returns fewer than `count` if the pool is too small —
 * the caller decides whether that's fatal (see `buildQuizItem`).
 */
export function pickDistractors(pool: string[], exclude: string[], count: number): string[] {
  const excludeLower = new Set(exclude.map((w) => w.toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of pool) {
    const lower = candidate.toLowerCase();
    if (excludeLower.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    out.push(candidate);
    if (out.length >= count) break;
  }
  return out;
}

/** Fisher–Yates. Pure and testable with an injected `random` for determinism in tests. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Builds one quiz item, or `null` if this word doesn't have the data this
 * `type` needs (no audio for DICTATION, no example sentence for CLOZE/
 * CONTEXTUAL_CHOICE, no synonym/antonym for MATCHING, or too few distractors
 * for a CHOICE type). Skipping is deliberate — a half-built quiz question
 * with no valid distractors would be worse than one fewer question in the batch.
 */
/**
 * The prompt text for a word+type+derived-answer combination. Split out
 * from `buildQuizItem` so `QuizService.answer` can reconstruct the same
 * human-readable question to hand Gemini as context for FR-5.5's nuance
 * explanation, without duplicating the wording in two places.
 */
export function promptFor(
  word: QuizSourceWord,
  type: QuizType,
  derived: { answer: string; maskedSentence?: string },
): string {
  switch (type) {
    case 'DICTATION':
      return 'Listen to the audio, then type the word you hear.';
    case 'CLOZE':
      return `Fill in the blank: "${derived.maskedSentence}"`;
    case 'CONTEXTUAL_CHOICE':
      return `Choose the word that completes the sentence: "${derived.maskedSentence}"`;
    case 'MATCHING': {
      const relation = word.synonyms[0]?.word ? 'synonym' : 'antonym';
      return `Which word is a ${relation} of "${word.sourceWord}"?`;
    }
  }
}

export function buildQuizItem(
  word: QuizSourceWord,
  type: QuizType,
  distractorPool: string[],
  random: () => number = Math.random,
): QuizItem | null {
  const derived = deriveCorrectAnswer(word, type);
  if (!derived) return null;

  const base = {
    id: `${word.topicWordId}:${type}`,
    type,
    topicWordId: word.topicWordId,
    topicId: word.topicId,
    prompt: promptFor(word, type, derived),
  };

  if (type === 'DICTATION') {
    return { ...base, audioUrl: word.audioUrl, answerMode: 'TEXT' };
  }
  if (type === 'CLOZE') {
    return { ...base, answerMode: 'TEXT' };
  }

  // CONTEXTUAL_CHOICE and MATCHING both need >= MIN_DISTRACTORS usable options.
  const distractors = pickDistractors(
    distractorPool,
    [derived.answer, word.sourceWord],
    MIN_DISTRACTORS,
  );
  if (distractors.length < MIN_DISTRACTORS) return null;
  return {
    ...base,
    options: shuffle([derived.answer, ...distractors], random),
    answerMode: 'CHOICE',
  };
}

/** FR-5.1–5.4's grading: case/whitespace-insensitive exact match. Shared by TEXT and CHOICE items alike. */
export function gradeAnswer(correctAnswer: string, submitted: string): boolean {
  return normalize(correctAnswer) === normalize(submitted);
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Parses a quiz item id back into its parts. Throws if malformed — callers should 404, not silently misgrade. */
export function parseQuizItemId(id: string): { topicWordId: string; type: QuizType } {
  const idx = id.lastIndexOf(':');
  const topicWordId = idx >= 0 ? id.slice(0, idx) : '';
  const type = idx >= 0 ? id.slice(idx + 1) : '';
  if (!topicWordId || !QUIZ_TYPES.includes(type as QuizType)) {
    throw new Error(`Malformed quiz item id: "${id}"`);
  }
  return { topicWordId, type: type as QuizType };
}
