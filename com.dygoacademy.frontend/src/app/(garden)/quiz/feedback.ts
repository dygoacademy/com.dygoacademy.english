import type { QuizScreenFeedback } from '@/components/garden/screens/QuizScreen';
import { forAccent } from '@/lib/accent';
import { formatIpa } from '@/lib/utils';
import type { QuizAnswerResult, SpeakingAccent } from '@/types';

/** The quiz's camelCase IPA pair in the profile accent (lib/accent.ts), formatted. */
export function quizIpa(
  word: { ipaUs?: string | null; ipaUk?: string | null },
  accent: SpeakingAccent,
): string | null {
  return formatIpa(forAccent({ ipa_us: word.ipaUs, ipa_uk: word.ipaUk }, accent).ipa);
}

/** POST /quizzes/:id/answer result → the quiz screen's feedback panel, IPA in the profile accent. */
export function toFeedback(result: QuizAnswerResult, accent: SpeakingAccent = 'US'): QuizScreenFeedback {
  const ipa = quizIpa(result, accent);
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
