import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { toFeedback } from '@/app/(garden)/garden/quiz/feedback';
import { renderWithIntl } from '@/test/render';
import type { QuizAnswerResult } from '@/types';

import { QuizScreen, quizPrompt, type QuizScreenProps } from './QuizScreen';

const base: QuizScreenProps = {
  topicTitle: 'Work',
  index: 2,
  total: 10,
  closeHref: '/garden/topics/t1',
  question: {
    id: 'w1:CLOZE',
    type: 'CLOZE',
    prompt: 'Fill in the blank: "She stayed ____ after the setback."',
    answerMode: 'TEXT',
  },
  feedback: null,
  hint: { status: 'idle' },
};

const choice: QuizScreenProps['question'] = {
  id: 'w2:CONTEXTUAL_CHOICE',
  type: 'CONTEXTUAL_CHOICE',
  prompt: 'Choose the word that completes the sentence: "A ____ plan."',
  answerMode: 'CHOICE',
  options: ['robust', 'fragile', 'brief'],
};

describe('QuizScreen', () => {
  it('shows the type tag, the prompt without its task prefix, and the count', () => {
    renderWithIntl(<QuizScreen {...base} />);
    expect(screen.getAllByText('Fill in the blank').length).toBeGreaterThan(0);
    expect(screen.getByText('"She stayed ____ after the setback."')).toBeTruthy();
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

  it('dictation has a play button', () => {
    renderWithIntl(
      <QuizScreen
        {...base}
        question={{ ...base.question, id: 'w1:DICTATION', type: 'DICTATION', audioUrl: 'a.mp3' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Play the word' })).toBeTruthy();
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
