import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { addMissed } from '@/app/(garden)/garden/quiz/results';
import { GARDEN_ROUTES } from '@/constants/garden';
import { renderWithIntl } from '@/test/render';

import { QuizResultScreen } from './QuizResultScreen';
import { TopicBedScreen, type TopicBedWord } from './TopicBedScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('QuizResultScreen (U5-6, UI-5 QZ-2)', () => {
  it('shows the score, the words that need water and Back to bed', () => {
    renderWithIntl(
      <QuizResultScreen
        closeHref="/garden/topics/t1"
        backHref="/garden/topics/t1"
        back="bed"
        correct={7}
        total={10}
        missed={[
          { id: 'w1', word: 'resilient' },
          { id: 'w2', word: 'mitigate' },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: '7 of 10 right' })).toBeTruthy();
    expect(screen.getByText('2 words need a little more water')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Words that need water' })).toBeTruthy();
    expect(screen.getByText('resilient')).toBeTruthy();
    expect(screen.getByText('mitigate')).toBeTruthy();
    const back = screen.getByRole('link', { name: 'Back to bed' });
    expect(back.getAttribute('href')).toBe('/garden/topics/t1');
    expect(screen.queryByRole('link', { name: 'Drill tricky words' })).toBeNull();
  });

  it('all right: bloom art, muted 0 tile, no missed list, no drill link', () => {
    renderWithIntl(
      <QuizResultScreen
        closeHref="/garden/topics"
        backHref="/garden/topics"
        back="topics"
        correct={5}
        total={5}
        missed={[]}
        drillHref="/garden/quiz?mode=leech"
      />,
    );
    expect(screen.getByText('Quiz done')).toBeTruthy();
    expect(screen.getByText('Every answer right. This bed is thriving.')).toBeTruthy();
    expect(screen.getByTestId('quiz-result-bloom')).toBeTruthy();
    expect(screen.queryByTestId('quiz-result-watering')).toBeNull();
    expect(screen.getByText('0').className).toContain('text-garden-placeholder');
    expect(screen.getByText('5').className).toContain('text-garden-success');
    expect(screen.queryByRole('heading', { name: 'Words that need water' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to topics' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Drill tricky words' })).toBeNull();
  });

  it('normal quiz with misses: watering-can art, gold tile and the drill link', () => {
    renderWithIntl(
      <QuizResultScreen
        closeHref="/garden/topics/t1"
        backHref="/garden/topics/t1"
        back="bed"
        correct={7}
        total={10}
        missed={[{ id: 'w1', word: 'drought' }]}
        drillHref="/garden/quiz?topic=t1&mode=leech"
      />,
    );
    expect(screen.getByTestId('quiz-result-watering')).toBeTruthy();
    expect(screen.getByText('1').className).toContain('text-garden-gold-text');
    expect(
      screen.getByRole('link', { name: 'Drill tricky words' }).getAttribute('href'),
    ).toBe('/garden/quiz?topic=t1&mode=leech');
  });

  it('drill result with misses: no drill link even when offered', () => {
    renderWithIntl(
      <QuizResultScreen
        closeHref="/garden/topics/t1"
        backHref="/garden/topics/t1"
        back="bed"
        correct={4}
        total={5}
        missed={[{ id: 'w1', word: 'drought' }]}
        drill
        drillHref="/garden/quiz?topic=t1&mode=leech"
      />,
    );
    expect(screen.getByText('Drill done')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Words that need water' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Drill tricky words' })).toBeNull();
  });
});

describe('addMissed', () => {
  it('keeps each word once, in the order first missed', () => {
    let list = addMissed([], 'w1', 'resilient');
    list = addMissed(list, 'w2', 'mitigate');
    list = addMissed(list, 'w1', 'resilient');
    expect(list.map((w) => w.word)).toEqual(['resilient', 'mitigate']);
  });
});

describe('GARDEN_ROUTES.quiz', () => {
  it('builds the bed quiz and leech drill links', () => {
    expect(GARDEN_ROUTES.quiz()).toBe('/garden/quiz');
    expect(GARDEN_ROUTES.quiz('t 1')).toBe('/garden/quiz?topic=t+1');
    expect(GARDEN_ROUTES.quiz('t1', 'leech')).toBe('/garden/quiz?topic=t1&mode=leech');
  });
});

describe('TopicBedScreen wilting rows', () => {
  const words: TopicBedWord[] = [
    { id: 'a', word: 'fragile', meaning: 'easily broken', stage: 'sprout', wilting: true, due: { tone: 'now' } },
    { id: 'b', word: 'robust', meaning: 'strong', stage: 'flower', due: { tone: 'later', days: 3 } },
  ];
  const props = {
    title: 'Work',
    meta: { collection: null, level: null, words: 2 },
    backHref: '/garden/topics',
    stageCounts: { seed: 0, sprout: 1, flower: 1, tree: 0 },
    words,
    water: null,
    quizHref: '/garden/quiz?topic=t1',
    addWordHref: '/add',
  };

  it('link to the leech drill when wiltingHref is set; other rows stay static', () => {
    renderWithIntl(<TopicBedScreen {...props} wiltingHref="/garden/quiz?topic=t1&mode=leech" />);
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/garden/quiz?topic=t1&mode=leech');
    expect(screen.getByRole('link', { name: /fragile/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /robust/ })).toBeNull();
  });

  it('without wiltingHref no row is a link', () => {
    renderWithIntl(<TopicBedScreen {...props} />);
    expect(screen.queryByRole('link', { name: /fragile/ })).toBeNull();
  });
});
