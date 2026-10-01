import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { toFeedback } from '@/app/(garden)/garden/quiz/feedback';
import { renderWithIntl } from '@/test/render';
import type { QuizAnswerResult } from '@/types';

import {
  QuizScreen,
  matchingPrompt,
  quizPrompt,
  sentenceParts,
  type QuizScreenProps,
} from './QuizScreen';

const base: QuizScreenProps = {
  topicTitle: 'Work',
  index: 2,
  total: 10,
  closeHref: '/garden/topics/t1',
  question: {
    id: 'w1:CLOZE',
    type: 'CLOZE',
    prompt: 'Fill in the blank: "She stayed _____ after the setback."',
    answerMode: 'TEXT',
  },
  feedback: null,
  hint: { status: 'idle' },
};

const choice: QuizScreenProps['question'] = {
  id: 'w2:CONTEXTUAL_CHOICE',
  type: 'CONTEXTUAL_CHOICE',
  prompt: 'Choose the word that completes the sentence: "A _____ plan."',
  answerMode: 'CHOICE',
  options: ['robust', 'fragile', 'brief'],
};

describe('QuizScreen', () => {
  it('shows the type tag, the sentence with an empty gap (no prefix, no quotes), and the count', () => {
    const { container } = renderWithIntl(<QuizScreen {...base} />);
    expect(screen.getAllByText('Fill in the blank').length).toBeGreaterThan(0);
    const gap = container.querySelector('[data-gap]');
    expect(gap?.getAttribute('data-gap')).toBe('empty');
    expect(gap?.textContent).toBe('');
    expect(gap?.parentElement?.textContent).toBe('She stayed  after the setback.');
    expect(screen.getByText('3/10')).toBeTruthy();
    expect(screen.getByText('Quiz · Work')).toBeTruthy();
  });

  it('text answers: hint on demand, trimmed submit', () => {
    const onSubmit = vi.fn();
    const onHint = vi.fn();
    renderWithIntl(<QuizScreen {...base} onSubmit={onSubmit} onHint={onHint} />);
    fireEvent.click(screen.getByRole('button', { name: 'Need a hint?' }));
    expect(onHint).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: '  resilient ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onSubmit).toHaveBeenCalledWith('resilient');
  });

  it('shows the hint once loaded', () => {
    renderWithIntl(
      <QuizScreen {...base} hint={{ status: 'shown', ipa: '/rɪˈzɪliənt/', definition: null }} />,
    );
    expect(screen.getByText('/rɪˈzɪliənt/')).toBeTruthy();
    expect(screen.getByText('No definition for this word yet.')).toBeTruthy();
  });

  it('dictation: the big play button and the app-language instruction, not the server prompt', () => {
    renderWithIntl(
      <QuizScreen
        {...base}
        question={{
          ...base.question,
          id: 'w1:DICTATION',
          type: 'DICTATION',
          prompt: 'Listen to the audio, then type the word you hear.',
          audioUrl: 'a.mp3',
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Play the word' }).className).toContain('h-[84px]');
    expect(screen.getByText('Listen, then type the word you hear.')).toBeTruthy();
    expect(screen.queryByText('Listen to the audio, then type the word you hear.')).toBeNull();
  });

  it('matching: the question in the app language and the asked word; unparsed prompts as they are', () => {
    const matching: QuizScreenProps['question'] = {
      id: 'w3:MATCHING',
      type: 'MATCHING',
      prompt: 'Which word is a synonym of "mitigate"?',
      answerMode: 'CHOICE',
      options: ['worsen', 'reduce'],
    };
    const { rerender } = renderWithIntl(<QuizScreen {...base} question={matching} />);
    expect(screen.getByText('Which word means the same as')).toBeTruthy();
    expect(screen.getByText('mitigate')).toBeTruthy();
    rerender(
      <QuizScreen
        {...base}
        question={{ ...matching, prompt: 'Which word is an antonym of "mitigate"?' }}
      />,
    );
    expect(screen.getByText('Which word means the opposite of')).toBeTruthy();
    rerender(
      <QuizScreen {...base} question={{ ...matching, id: 'w4', prompt: 'Pick the odd one out.' }} />,
    );
    expect(screen.getByText('Pick the odd one out.')).toBeTruthy();
  });

  it('matching right answer: the panel names the asked word, not the option', () => {
    renderWithIntl(
      <QuizScreen
        {...base}
        question={{
          id: 'w3:MATCHING',
          type: 'MATCHING',
          prompt: 'Which word is a synonym of "mitigate"?',
          answerMode: 'CHOICE',
          options: ['worsen', 'reduce'],
        }}
        initialPick="reduce"
        feedback={{ correct: true, correctAnswer: 'reduce', word: 'reduce', ipa: '/ˈmɪt.ɪ.ɡeɪt/' }}
      />,
    );
    expect(screen.getByText('mitigate · /ˈmɪt.ɪ.ɡeɪt/')).toBeTruthy();
  });

  it('wrong answer: the gap shows the answer in gold; word · definition from the hint', () => {
    const { container } = renderWithIntl(
      <QuizScreen
        {...base}
        hint={{ status: 'shown', ipa: null, definition: 'able to recover quickly' }}
        feedback={{ correct: false, correctAnswer: 'resilient', word: 'resilient' }}
      />,
    );
    const gap = container.querySelector('[data-gap]');
    expect(gap?.getAttribute('data-gap')).toBe('wrong');
    expect(gap?.textContent).toBe('resilient');
    expect(screen.getByText('resilient · able to recover quickly')).toBeTruthy();
  });

  it('choice answers: a pick submits; a wrong pick is "Your pick", never ✕', () => {
    const onSubmit = vi.fn();
    const { rerender } = renderWithIntl(
      <QuizScreen {...base} question={choice} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fragile' }));
    expect(onSubmit).toHaveBeenCalledWith('fragile');
    rerender(
      <QuizScreen
        {...base}
        question={choice}
        onSubmit={onSubmit}
        feedback={{ correct: false, correctAnswer: 'robust', word: 'robust', note: 'comesBack' }}
      />,
    );
    expect(screen.getByText('Your pick')).toBeTruthy();
    expect(screen.getByText('Not quite — it’s “robust”')).toBeTruthy();
    // No definition anywhere: just the word.
    expect(screen.getAllByText('robust').length).toBeGreaterThan(1);
    expect(screen.getByText('This word comes back in your next watering.')).toBeTruthy();
    expect(screen.queryByText('✕')).toBeNull();
    expect(screen.getByRole('button', { name: 'robust' }).hasAttribute('disabled')).toBe(true);
  });

  it('right answer: word, IPA, example, and Next / See results', () => {
    const onNext = vi.fn();
    renderWithIntl(
      <QuizScreen
        {...base}
        isLast
        onNext={onNext}
        feedback={{
          correct: true,
          correctAnswer: 'resilient',
          word: 'resilient',
          ipa: '/rɪˈzɪliənt/',
          example: 'Kids are resilient.',
        }}
      />,
    );
    expect(screen.getByText('That’s right!')).toBeTruthy();
    expect(screen.getByText('resilient · /rɪˈzɪliənt/')).toBeTruthy();
    expect(screen.getByText('“Kids are resilient.”')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'See results' }));
    expect(onNext).toHaveBeenCalled();
  });
});

describe('quiz helpers', () => {
  it('quizPrompt strips only the known prefixes', () => {
    expect(quizPrompt('MATCHING', 'Fill in the blank: x')).toBe('Fill in the blank: x');
    expect(quizPrompt('CLOZE', 'fill in the blank:  x')).toBe('x');
  });

  it('sentenceParts splits on the five-underscore gap, without prefix or quotes', () => {
    expect(
      sentenceParts('CLOZE', 'Fill in the blank: "Cities need more _____ forms of transport."'),
    ).toEqual({ before: 'Cities need more ', after: ' forms of transport.' });
    expect(
      sentenceParts(
        'CONTEXTUAL_CHOICE',
        'Choose the word that completes the sentence: “_____ hit the region.”',
      ),
    ).toEqual({ before: '', after: ' hit the region.' });
    // No gap, or not a sentence type: show the prompt as it is.
    expect(sentenceParts('CLOZE', 'Fill in the blank: "No gap here."')).toBeNull();
    expect(sentenceParts('MATCHING', 'A _____ b')).toBeNull();
  });

  it('matchingPrompt reads synonym / antonym and the word, else null', () => {
    expect(matchingPrompt('Which word is a synonym of "mitigate"?')).toEqual({
      relation: 'synonym',
      word: 'mitigate',
    });
    expect(matchingPrompt('Which word is an antonym of "carbon footprint"?')).toEqual({
      relation: 'antonym',
      word: 'carbon footprint',
    });
    expect(matchingPrompt('Which word is a cousin of "mitigate"?')).toBeNull();
    expect(matchingPrompt('mitigate')).toBeNull();
  });

  it('toFeedback maps the SRS note', () => {
    const r = {
      quizItemId: 'i',
      correct: false,
      correctAnswer: 'a',
      word: 'a',
      ipaUs: null,
      hintUsed: false,
      srs: { graded: true, justMastered: false, nextDueAt: '' },
    } as QuizAnswerResult;
    expect(toFeedback(r).note).toBe('comesBack');
    expect(toFeedback({ ...r, correct: true, srs: { ...r.srs!, justMastered: true } }).note).toBe(
      'mastered',
    );
    expect(toFeedback({ ...r, srs: undefined }).note).toBeNull();
  });
});
