import { decideGrading, gradeFlashcard, gradeQuizAnswer } from './grading';

describe('grading — quiz answers', () => {
  it.each([
    ['CLOZE', true, false, 'GOOD'],
    ['DICTATION', true, false, 'GOOD'],
    ['MATCHING', true, false, 'HARD'],
    ['CONTEXTUAL_CHOICE', true, false, 'HARD'],
    ['CLOZE', true, true, 'HARD'],
    ['DICTATION', true, true, 'HARD'],
    ['MATCHING', false, false, 'AGAIN'],
    ['CLOZE', false, true, 'AGAIN'],
  ] as const)('%s correct=%s hint=%s → %s', (quizType, correct, hintUsed, expected) => {
    expect(gradeQuizAnswer({ quizType, correct, hintUsed })).toBe(expected);
  });
});

describe('grading — flashcard self-ratings', () => {
  it('count at face value on a word already being studied', () => {
    for (const r of ['AGAIN', 'HARD', 'GOOD', 'EASY'] as const) {
      expect(gradeFlashcard(r, false)).toBe(r);
    }
  });

  it("'Too easy' on a never-seen word counts as GOOD", () => {
    expect(gradeFlashcard('EASY', true)).toBe('GOOD');
    expect(gradeFlashcard('GOOD', true)).toBe('GOOD');
  });
});

describe('grading — does this review move the schedule?', () => {
  const base = { isNewCard: false, isDue: true, lapseAlreadyCountedToday: false };

  it('a mistake always counts, at most once per word per local day', () => {
    expect(decideGrading({ ...base, rating: 'AGAIN', isDue: false })).toEqual({ graded: true });
    expect(decideGrading({ ...base, rating: 'AGAIN', lapseAlreadyCountedToday: true })).toEqual({
      graded: false,
      reason: 'lapse_already_counted_today',
    });
  });

  it('a success counts when the word is due or brand new', () => {
    expect(decideGrading({ ...base, rating: 'GOOD' })).toEqual({ graded: true });
    expect(decideGrading({ ...base, rating: 'HARD', isNewCard: true, isDue: false })).toEqual({
      graded: true,
    });
  });

  it('a success on a word that is not due yet is logged only', () => {
    expect(decideGrading({ ...base, rating: 'GOOD', isDue: false })).toEqual({
      graded: false,
      reason: 'not_due',
    });
  });

  it('a success on the 10-minute retry after a mistake still counts', () => {
    expect(
      decideGrading({ ...base, rating: 'GOOD', isDue: true, lapseAlreadyCountedToday: true }),
    ).toEqual({ graded: true });
  });
});
