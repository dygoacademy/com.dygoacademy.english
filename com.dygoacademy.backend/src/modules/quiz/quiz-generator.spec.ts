import {
  MIN_DISTRACTORS,
  QuizSourceWord,
  buildQuizItem,
  deriveCorrectAnswer,
  gradeAnswer,
  parseQuizItemId,
  pickDistractors,
  promptFor,
} from './quiz-generator';

function makeWord(overrides: Partial<QuizSourceWord> = {}): QuizSourceWord {
  return {
    topicWordId: 'tw-1',
    topicId: 'topic-1',
    sourceWord: 'resilient',
    audioUrl: 'https://cdn.example/resilient.wav',
    synonyms: [{ word: 'tough', level: 'B1' }],
    antonyms: [{ word: 'fragile', level: 'B1' }],
    exampleSentences: [
      { sentence: 'She remained resilient after the setback.', level: 'B1', translation_hint: '' },
    ],
    ...overrides,
  };
}

describe('deriveCorrectAnswer', () => {
  it('DICTATION uses the source word, and requires audio', () => {
    expect(deriveCorrectAnswer(makeWord(), 'DICTATION')).toEqual({ answer: 'resilient' });
    expect(deriveCorrectAnswer(makeWord({ audioUrl: null }), 'DICTATION')).toBeNull();
  });

  it('CLOZE masks the word in the first example sentence, case-insensitively', () => {
    const result = deriveCorrectAnswer(makeWord(), 'CLOZE');
    expect(result?.answer).toBe('resilient');
    expect(result?.maskedSentence).toBe('She remained _____ after the setback.');
  });

  it('CLOZE/CONTEXTUAL_CHOICE return null when the word does not literally appear in its own example sentence', () => {
    const word = makeWord({
      exampleSentences: [
        { sentence: 'A story about toughness.', level: 'B1', translation_hint: '' },
      ],
    });
    expect(deriveCorrectAnswer(word, 'CLOZE')).toBeNull();
    expect(deriveCorrectAnswer(word, 'CONTEXTUAL_CHOICE')).toBeNull();
  });

  it('CLOZE/CONTEXTUAL_CHOICE return null with no example sentences at all', () => {
    expect(deriveCorrectAnswer(makeWord({ exampleSentences: [] }), 'CLOZE')).toBeNull();
  });

  it('MATCHING prefers the first synonym, falling back to the first antonym', () => {
    expect(deriveCorrectAnswer(makeWord(), 'MATCHING')).toEqual({ answer: 'tough' });
    expect(deriveCorrectAnswer(makeWord({ synonyms: [] }), 'MATCHING')).toEqual({
      answer: 'fragile',
    });
    expect(deriveCorrectAnswer(makeWord({ synonyms: [], antonyms: [] }), 'MATCHING')).toBeNull();
  });
});

describe('gradeAnswer', () => {
  it('is case- and whitespace-insensitive', () => {
    expect(gradeAnswer('Resilient', '  resilient  ')).toBe(true);
    expect(gradeAnswer('resilient', 'resiliant')).toBe(false);
  });
});

describe('pickDistractors', () => {
  it('excludes the correct answer and the target word, case-insensitively, and dedupes', () => {
    const result = pickDistractors(
      ['Tough', 'brave', 'brave', 'RESILIENT', 'happy', 'sad'],
      ['tough', 'resilient'],
      3,
    );
    expect(result).toEqual(['brave', 'happy', 'sad']);
  });

  it('returns fewer than requested when the pool is too small', () => {
    expect(pickDistractors(['brave'], [], 3)).toEqual(['brave']);
  });
});

describe('buildQuizItem', () => {
  const pool = ['brave', 'happy', 'sad', 'quiet'];

  it('builds a TEXT-mode DICTATION item', () => {
    const item = buildQuizItem(makeWord(), 'DICTATION', pool);
    expect(item).toMatchObject({
      id: 'tw-1:DICTATION',
      answerMode: 'TEXT',
      audioUrl: makeWord().audioUrl,
    });
  });

  it('builds a TEXT-mode CLOZE item with the masked sentence in the prompt', () => {
    const item = buildQuizItem(makeWord(), 'CLOZE', pool);
    expect(item?.answerMode).toBe('TEXT');
    expect(item?.prompt).toContain('_____');
  });

  it('builds a CHOICE-mode MATCHING item with the correct answer among the shuffled options', () => {
    const item = buildQuizItem(makeWord(), 'MATCHING', pool, () => 0);
    expect(item?.answerMode).toBe('CHOICE');
    expect(item?.options).toHaveLength(1 + MIN_DISTRACTORS);
    expect(item?.options).toContain('tough');
  });

  it('returns null for a CHOICE-mode type when the distractor pool is too small', () => {
    const item = buildQuizItem(makeWord(), 'MATCHING', ['brave']);
    expect(item).toBeNull();
  });

  it('returns null when the underlying data is missing (no audio, no examples, no synonyms/antonyms)', () => {
    const bareWord = makeWord({ audioUrl: null, exampleSentences: [], synonyms: [], antonyms: [] });
    expect(buildQuizItem(bareWord, 'DICTATION', pool)).toBeNull();
    expect(buildQuizItem(bareWord, 'CLOZE', pool)).toBeNull();
    expect(buildQuizItem(bareWord, 'MATCHING', pool)).toBeNull();
  });
});

describe('promptFor', () => {
  it('produces the same wording buildQuizItem embeds, for QuizService.answer to reuse as AI context', () => {
    const word = makeWord();
    const derived = deriveCorrectAnswer(word, 'MATCHING')!;
    expect(promptFor(word, 'MATCHING', derived)).toBe('Which word is a synonym of "resilient"?');
  });
});

describe('parseQuizItemId', () => {
  it('round-trips a deterministic id', () => {
    expect(parseQuizItemId('tw-1:CLOZE')).toEqual({ topicWordId: 'tw-1', type: 'CLOZE' });
  });

  it('throws on a malformed or unknown-type id', () => {
    expect(() => parseQuizItemId('no-colon-here')).toThrow();
    expect(() => parseQuizItemId('tw-1:NOT_A_TYPE')).toThrow();
  });
});
