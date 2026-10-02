import type { QuizScreenFeedback } from '@/components/garden/screens/QuizScreen';
import { formatIpa } from '@/lib/utils';
import type { QuizAnswerResult } from '@/types';

/** POST /quizzes/:id/answer result → the quiz screen's feedback panel. */
export function toFeedback(result: QuizAnswerResult): QuizScreenFeedback {
  const ipa = formatIpa(result.ipaUs);
  return {
    correct: result.correct,
    correctAnswer: result.correctAnswer,
    word: result.word,
    ipa: ipa || null,
    example: result.exampleSentence ?? null,
    explanation: result.nuanceExplanation ?? null,
    note: result.srs?.graded
      ? result.correct
        ? result.srs.justMastered
          ? 'mastered'
          : null
        : 'comesBack'
      : null,
  };
}
