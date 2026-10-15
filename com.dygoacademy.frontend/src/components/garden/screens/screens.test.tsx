import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import messages from '../../../../messages/en-US.json';

import {
  ALL_WATERED,
  BED,
  COMEBACK,
  COMEBACK_START,
  HARVEST,
  HOME,
  ME,
  REFERENCE_NAMES,
  REVIEW,
  TOPICS,
  TOPICS_ACADEMIC_FILTER,
  TOPICS_LOCKED_PACK,
  isReferenceName,
} from './fixtures';
import { AllWateredScreen } from './AllWateredScreen';
import { MeScreen } from './MeScreen';
import { ReviewScreen } from './ReviewScreen';
import { TodaysGardenScreen } from './TodaysGardenScreen';
import { TopicBedScreen } from './TopicBedScreen';
import { TopicsScreen } from './TopicsScreen';
import { WeeklyHarvestScreen } from './WeeklyHarvestScreen';
import { WelcomeBackScreen } from './WelcomeBackScreen';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('reference fixtures', () => {
  it('lists the 81 canvas references (… 5 speaking, 4 speaking entry points, 15 pronunciation, 6 voice donation, 4 onboarding, 3 loading)', () => {
    expect(REFERENCE_NAMES).toHaveLength(81);
    expect(isReferenceName('A1b-all-watered')).toBe(true);
    expect(isReferenceName('A7c-word-search')).toBe(true);
    expect(isReferenceName('A6b-search-topics')).toBe(true);
    expect(isReferenceName('SE5-entry-harvest')).toBe(true);
    expect(isReferenceName('SP3-speak-done')).toBe(true);
    expect(isReferenceName('H1-home-phone')).toBe(true);
    expect(isReferenceName('H2-home-desktop')).toBe(true);
    expect(isReferenceName('Q8-quiz-drill-done')).toBe(true);
    expect(isReferenceName('Q4-quiz-cloze-hint')).toBe(true);
    expect(isReferenceName('AU3-create-account-invite')).toBe(true);
    expect(isReferenceName('AU1-sign-in-error')).toBe(true);
    expect(isReferenceName('A8e-privacy-confirm')).toBe(true);
    expect(isReferenceName('AU2-create-account-donate')).toBe(true);
    expect(isReferenceName('AU4-reset-password-sent')).toBe(true);
    expect(isReferenceName('GR5-invite')).toBe(true);
    expect(isReferenceName('A7-topic-bed-filter-sprouts')).toBe(true);
    expect(isReferenceName('iP2b-not-heard')).toBe(true);
    expect(isReferenceName('OB1-about-you-work')).toBe(true);
    expect(isReferenceName('A9-nope')).toBe(false);
  });
});

describe('TodaysGardenScreen', () => {
  it('renders the canvas copy from the fixture', () => {
    renderWithIntl(<TodaysGardenScreen {...HOME} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Good evening, Minh');
    expect(screen.getByText('412 words growing')).toBeTruthy();
    expect(screen.getByText('1 of 3 done')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Garden' }).getAttribute('aria-current')).toBe('page');
  });

  it('opens with Next up: the first open mission, with its own Start button', () => {
    renderWithIntl(<TodaysGardenScreen {...HOME} />);
    expect(screen.getByText('Next up')).toBeTruthy();
    expect(screen.getByText('Water 3 thirsty words')).toBeTruthy();
    expect(screen.getByText('15 of 18 done')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Start watering' }).getAttribute('href')).toBe('/review');
    expect(screen.queryByText('Water your garden')).toBeNull();
  });

  it('lists the other missions under Then: open ones link, done ones are plain', () => {
    renderWithIntl(<TodaysGardenScreen {...HOME} />);
    expect(screen.getByText('Then')).toBeTruthy();
    const quiz = screen.getByRole('link', { name: /Collocation challenge/ });
    expect(quiz.getAttribute('href')).toBe('/quiz');
    expect(within(quiz).getByText('3 min')).toBeTruthy();
    // The finished plant mission shows as done and opens nothing.
    expect(screen.queryByRole('link', { name: /Plant 5 new words/ })).toBeNull();
    expect(screen.getByText('Plant 5 new words').className).toContain('line-through');
    // Open rows come before done ones.
    const list = screen.getByText('Then').nextElementSibling as HTMLElement;
    const items = within(list).getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(items[0]).toMatch(/Collocation challenge/);
    expect(items[1]).toMatch(/Plant 5 new words/);
  });

  it('labels the Start button by the next mission', () => {
    renderWithIntl(
      <TodaysGardenScreen
        {...HOME}
        missions={[
          { kind: 'water', done: 18, total: 18, href: '/review' },
          { kind: 'speak', done: 0, total: 3, minutes: 2, href: '/sounds' },
          { kind: 'challenge', minutes: null, done: false, href: '/quiz' },
        ]}
      />,
    );
    expect(screen.getByText('Say 3 ripe words')).toBeTruthy();
    expect(screen.getByText('Not started · about 2 min')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Start speaking' }).getAttribute('href')).toBe('/sounds');
    expect(screen.queryByRole('link', { name: 'Start watering' })).toBeNull();
  });

  it('shows no Next up panel when every mission is done', () => {
    renderWithIntl(
      <TodaysGardenScreen
        {...HOME}
        missions={[
          { kind: 'water', done: 18, total: 18, href: '/review' },
          { kind: 'plant', done: 5, total: 5, href: '/plant' },
          { kind: 'challenge', minutes: 3, done: true, href: '/quiz' },
        ]}
        goldenBloom
      />,
    );
    expect(screen.queryByText('Next up')).toBeNull();
    expect(screen.queryByText('Then')).toBeNull();
    expect(screen.queryByRole('link', { name: /^Start/ })).toBeNull();
    const list = screen.getByText('Plant 5 new words').closest('ul') as HTMLElement;
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/is open/)).toBeTruthy();
  });

  it('shows "coming soon" instead of mission numbers when missions are unknown', () => {
    renderWithIntl(<TodaysGardenScreen {...HOME} missions={null} ripens={null} />);
    expect(screen.getByText(/Daily missions are on the way/)).toBeTruthy();
    expect(screen.queryByText('1 of 3 done')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('ReviewScreen', () => {
  const props = {
    missionTitle: 'Water 18 words',
    done: REVIEW.done,
    total: REVIEW.total,
    closeHref: '/garden',
    card: REVIEW.card,
    intervals: REVIEW.intervals,
    bloomHref: '/review/done',
  };

  it('flips to the answer and the rating bar on "Show answer"', () => {
    renderWithIntl(<ReviewScreen {...props} state="question" />);
    expect(screen.queryByText(REVIEW.card.meaning)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByText(REVIEW.card.meaning)).toBeTruthy();
    expect(screen.getByRole('group', { name: 'How well did you remember it?' })).toBeTruthy();
  });

  it('passes the rating up', () => {
    const onRate = vi.fn();
    renderWithIntl(<ReviewScreen {...props} state="answer" onRate={onRate} />);
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    expect(onRate).toHaveBeenCalledWith('good');
  });

  it('shows the finished state', () => {
    renderWithIntl(<ReviewScreen {...props} state="finished" done={18} />);
    expect(screen.getByRole('heading', { name: 'All 18 watered' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See your garden bloom' })).toBeTruthy();
  });

  describe('keyboard (U7-3)', () => {
    it('Space shows the answer, then 1–4 rate', () => {
      const onRate = vi.fn();
      renderWithIntl(<ReviewScreen {...props} state="question" onRate={onRate} />);
      expect(
        screen.getByRole('button', { name: 'Show answer' }).getAttribute('aria-keyshortcuts'),
      ).toBe('Space');
      fireEvent.keyDown(window, { key: '3' });
      expect(onRate).not.toHaveBeenCalled();
      fireEvent.keyDown(window, { key: ' ' });
      expect(screen.getByText(REVIEW.card.meaning)).toBeTruthy();
      fireEvent.keyDown(window, { key: '3' });
      expect(onRate).toHaveBeenCalledWith('good');
    });

    it('calls onShowAnswer on Space when the page owns the state', () => {
      const onShowAnswer = vi.fn();
      renderWithIntl(<ReviewScreen {...props} state="question" onShowAnswer={onShowAnswer} />);
      fireEvent.keyDown(window, { key: ' ' });
      expect(onShowAnswer).toHaveBeenCalledTimes(1);
    });

    it('P plays the word', () => {
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
      const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
      const { unmount } = renderWithIntl(<ReviewScreen {...props} state="question" />);
      fireEvent.keyDown(window, { key: 'P' });
      expect(play).toHaveBeenCalledTimes(1);
      unmount();
      play.mockRestore();
      pause.mockRestore();
    });

    it('Esc leaves to closeHref', () => {
      push.mockClear();
      renderWithIntl(<ReviewScreen {...props} state="answer" />);
      expect(screen.getByRole('link', { name: 'Close' }).getAttribute('aria-keyshortcuts')).toBe(
        'Escape',
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(push).toHaveBeenCalledWith('/garden');
    });

    it('ignores keys while a sheet is open or in a text field, and when turned off', () => {
      push.mockClear();
      const onShowAnswer = vi.fn();
      const { unmount } = renderWithIntl(
        <>
          <input aria-label="note" />
          <ReviewScreen {...props} state="question" onShowAnswer={onShowAnswer} />
          <div role="dialog" aria-label="sheet" />
        </>,
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: ' ' });
      fireEvent.keyDown(screen.getByRole('textbox', { name: 'note' }), { key: ' ' });
      expect(push).not.toHaveBeenCalled();
      expect(onShowAnswer).not.toHaveBeenCalled();
      unmount();
      renderWithIntl(
        <ReviewScreen
          {...props}
          state="question"
          onShowAnswer={onShowAnswer}
          keyboardShortcuts={false}
        />,
      );
      fireEvent.keyDown(window, { key: ' ' });
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(push).not.toHaveBeenCalled();
      expect(onShowAnswer).not.toHaveBeenCalled();
    });

    it('leaves Space to a focused button', () => {
      const onShowAnswer = vi.fn();
      renderWithIntl(<ReviewScreen {...props} state="question" onShowAnswer={onShowAnswer} />);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Show answer' }), { key: ' ' });
      expect(onShowAnswer).not.toHaveBeenCalled();
    });
  });
});

describe('WeeklyHarvestScreen', () => {
  const base = HARVEST;

  it("links the group card to that group's garden", () => {
    renderWithIntl(
      <WeeklyHarvestScreen {...base} group={{ ...HARVEST.group, href: '/groups/g1' }} />,
    );
    const card = screen.getByRole('link', { name: /IELTS Sprint group/ });
    expect(card.getAttribute('href')).toBe('/groups/g1');
    expect(card.textContent).toContain('4 of 5 watered today · 126 shared words');
  });

  it('has no group card without a group', () => {
    renderWithIntl(<WeeklyHarvestScreen {...base} group={null} />);
    expect(screen.queryByText(/watered today/)).toBeNull();
    expect(screen.queryByText('IELTS Sprint group')).toBeNull();
  });
});

describe('TopicsScreen', () => {
  function renderTopics() {
    return renderWithIntl(
      <TopicsScreen
        topics={TOPICS}
        filters={[
          TOPICS_ACADEMIC_FILTER,
          { id: 'mine', label: 'Mine' },
        ]}
        lockedPack={TOPICS_LOCKED_PACK}
        searchHref="/search"
        newBedHref="/topics/new"
      />,
    );
  }

  it('filters the beds with the chips', () => {
    renderTopics();
    expect(screen.getByText('5 beds · 196 words')).toBeTruthy();
    expect(screen.getByText('Environment')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mine' }));
    expect(screen.getByRole('button', { name: 'Mine' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('Environment')).toBeNull();
    expect(screen.getByText('Work & careers')).toBeTruthy();
    // The locked pack only belongs to All and IELTS Academic.
    expect(screen.queryByText('Academic Word List')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'IELTS Academic' }));
    expect(screen.getByText('Academic Word List')).toBeTruthy();
    expect(screen.queryByText('Work & careers')).toBeNull();
  });

  it('links search to A6b', () => {
    renderTopics();
    expect(screen.getByRole('link', { name: 'Search topics' }).getAttribute('href')).toBe('/search');
  });
});

describe('TopicBedScreen', () => {
  const props = {
    ...BED,
    backHref: '/topics',
    water: { count: 6, href: '/review' },
    quizHref: '/quiz',
    addWordHref: '/add',
  };

  it('filters the words by stage, and a second tap clears it', () => {
    renderWithIntl(<TopicBedScreen {...props} />);
    expect(screen.getByRole('heading', { name: 'All words' })).toBeTruthy();
    const sprouts = screen.getByRole('button', { name: /11\s*Sprouts/ });
    fireEvent.click(sprouts);
    expect(sprouts.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Sprouts in this bed' })).toBeTruthy();
    const list = screen.getAllByRole('list').at(-1)!;
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(sprouts);
    expect(screen.getByRole('heading', { name: 'All words' })).toBeTruthy();
  });

  it('Plant N new takes the main button when nothing is due, else sits under Water', () => {
    const plant = { count: 5, href: '/review?new=5&topic=t1' };
    const { unmount } = renderWithIntl(<TopicBedScreen {...props} water={null} plant={plant} />);
    expect(screen.queryByText('Nothing due')).toBeNull();
    expect(screen.getByRole('link', { name: 'Plant 5 new' }).getAttribute('href')).toBe(plant.href);
    unmount();
    renderWithIntl(<TopicBedScreen {...props} plant={plant} />);
    expect(screen.getByRole('link', { name: /Water 6 due/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Plant 5 new' })).toBeTruthy();
  });

  it('shows Nothing due when the bed has neither due words nor seeds', () => {
    renderWithIntl(<TopicBedScreen {...props} water={null} plant={null} />);
    expect(screen.getByText('Nothing due')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Plant/ })).toBeNull();
  });

  it('SE2: shows the Speak row only when the bed has sentences', () => {
    const { unmount } = renderWithIntl(
      <TopicBedScreen {...props} speak={{ count: 5, href: '/sounds?topic=t1' }} />,
    );
    const speak = screen.getByRole('link', { name: /Speak · 5 sentences from this bed/ });
    expect(speak.getAttribute('href')).toBe('/sounds?topic=t1');
    unmount();
    renderWithIntl(<TopicBedScreen {...props} speak={null} />);
    expect(screen.queryByRole('link', { name: /Speak/ })).toBeNull();
  });

  describe('Bees are waiting', () => {
    const bee = (id: string, pollinated = false) => ({
      id,
      word: id,
      sound: `/${id}/`,
      pollinated,
      href: `/sounds/word?words=${id}&back=%2Ftopics%2Ft1`,
    });

    it('lists waiting words with a mic and pollinated ones with a tick', () => {
      renderWithIntl(
        <TopicBedScreen
          {...props}
          bees={{
            waiting: 2,
            sayAllHref: '/sounds/word?words=deforestation%2Cecosystem&back=%2Ftopics%2Ft1',
            words: [bee('mitigate', true), bee('deforestation'), bee('ecosystem')],
          }}
        />,
      );
      const card = screen.getByRole('region', { name: 'Bees are waiting' });
      expect(
        within(card).getByText('2 flowers want to be heard. Say each word to pollinate it.'),
      ).toBeTruthy();
      expect(within(card).getByText('Pollinated · on its way to fruit')).toBeTruthy();
      expect(within(card).getAllByText('Say it to pollinate')).toHaveLength(2);
      expect(within(card).getByText('/mitigate/').getAttribute('lang')).toBe('en');
      expect(within(card).queryByRole('link', { name: 'Say mitigate to pollinate' })).toBeNull();
      expect(
        within(card)
          .getByRole('link', { name: 'Say ecosystem to pollinate' })
          .getAttribute('href'),
      ).toBe('/sounds/word?words=ecosystem&back=%2Ftopics%2Ft1');
      expect(within(card).getByRole('link', { name: 'Say all' }).getAttribute('href')).toBe(
        '/sounds/word?words=deforestation%2Cecosystem&back=%2Ftopics%2Ft1',
      );
    });

    it('says so when all are pollinated, with no Say all', () => {
      renderWithIntl(
        <TopicBedScreen
          {...props}
          bees={{ waiting: 0, sayAllHref: null, words: [bee('mitigate', true)] }}
        />,
      );
      const card = screen.getByRole('region', { name: 'Bees are waiting' });
      expect(
        within(card).getByText('All flowers pollinated today. New bees come tomorrow.'),
      ).toBeTruthy();
      expect(within(card).queryByRole('link', { name: 'Say all' })).toBeNull();
    });

    it('uses one-flower wording', () => {
      renderWithIntl(
        <TopicBedScreen
          {...props}
          bees={{ waiting: 1, sayAllHref: '/sounds?words=a', words: [bee('a')] }}
        />,
      );
      expect(
        screen.getByText('1 flower wants to be heard. Say it to pollinate it.'),
      ).toBeTruthy();
    });

    it('is hidden with no rows', () => {
      const { unmount } = renderWithIntl(<TopicBedScreen {...props} bees={null} />);
      expect(screen.queryByRole('region', { name: 'Bees are waiting' })).toBeNull();
      unmount();
      renderWithIntl(
        <TopicBedScreen {...props} bees={{ waiting: 0, sayAllHref: null, words: [] }} />,
      );
      expect(screen.queryByRole('region', { name: 'Bees are waiting' })).toBeNull();
    });

    it('animates with classes reduced motion turns off', () => {
      const { container } = renderWithIntl(
        <TopicBedScreen
          {...props}
          bees={{ waiting: 1, sayAllHref: '/sounds?words=b', words: [bee('a', true), bee('b')] }}
        />,
      );
      // globals.css stops .bee-hover and .spark under prefers-reduced-motion.
      expect(container.querySelectorAll('.bee-hover')).toHaveLength(2);
      expect(container.querySelectorAll('.spark')).toHaveLength(2);
    });
  });

  it('A7c: the header search button opens this bed\'s word search', () => {
    renderWithIntl(<TopicBedScreen {...props} searchHref="/topics/t1/search" />);
    expect(
      screen.getByRole('link', { name: `Search words in ${props.title}` }).getAttribute('href'),
    ).toBe('/topics/t1/search');
  });

  it("can't filter when stage counts are unknown", () => {
    renderWithIntl(<TopicBedScreen {...props} stageCounts={null} />);
    const seeds = screen.getByRole('button', { name: /Seeds/ }) as HTMLButtonElement;
    expect(seeds.disabled).toBe(true);
    expect(seeds.textContent).toContain('—');
  });
});

describe('MeScreen', () => {
  it('toggles the ripening reminder', () => {
    const onReminderChange = vi.fn();
    renderWithIntl(
      <MeScreen
        {...ME}
        dailyGoal={{ ...ME.dailyGoal, href: '/missions' }}
        family={{ ...ME.family, href: '/' }}
        onReminderChange={onReminderChange}
      />,
    );
    const toggle = screen.getByRole('switch', { name: 'Ripening reminder' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(onReminderChange).toHaveBeenCalledWith(false);
  });

  it('shows dashes, not numbers, for unknown stats', () => {
    renderWithIntl(
      <MeScreen
        {...ME}
        stats={{ fruiting: null, bestStreak: 5, hours: null, goldenBlooms: null }}
        calendar={null}
        keepsakes={null}
        dailyGoal={null}
        reminder={null}
        family={null}
      />,
    );
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('always writes the IELTS band with one decimal point, never a locale comma', () => {
    // vi-VN formats numbers with a comma decimal separator ("7,0"), but a
    // band score is written "7.0" in every language (it's a score, not a
    // quantity formatted for the reader's locale).
    render(
      <NextIntlClientProvider locale="vi" messages={messages}>
        <MeScreen {...ME} dailyGoal={null} reminder={null} family={null} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('IELTS Academic · target band 7.0')).toBeTruthy();
  });
});

describe('AllWateredScreen (A1b)', () => {
  const extras = {
    plant: { bed: 'Environment', href: '/review?new=5&topic=t1' },
    speakHref: '/sounds',
    quizHref: '/quiz?topic=t2',
  };
  const more = () =>
    screen.getByRole('heading', { name: 'Want a little more?' }).closest('section') as HTMLElement;

  it('rests the garden and shows the Golden Bloom with the next ripening', () => {
    renderWithIntl(<AllWateredScreen {...ALL_WATERED} extras={extras} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Good evening, Minh');
    expect(screen.getByRole('heading', { name: 'All watered today' })).toBeTruthy();
    expect(screen.getByText('Nothing is thirsty. Your garden is resting.')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Your garden by stage' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Resting garden with a sun and a butterfly' })).toBeTruthy();
    expect(screen.getByText('3 of 3 missions · Golden Bloom grown')).toBeTruthy();
    expect(screen.getByText('Next ripening: tomorrow 7:30 AM · 14 words')).toBeTruthy();
  });

  it('offers the three extras with their links', () => {
    renderWithIntl(<AllWateredScreen {...ALL_WATERED} extras={extras} />);
    const links = within(more()).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/review?new=5&topic=t1',
      '/sounds',
      '/quiz?topic=t2',
    ]);
    expect(links[0].textContent).toBe('Plant 5 new wordsFrom Environment');
    expect(links[1].textContent).toBe('Say 3 sentencesAbout 2 min');
    expect(links[2].textContent).toBe('Quiz a bed10 quick questions');
  });

  it('hides the plant row when no bed has seeds', () => {
    renderWithIntl(<AllWateredScreen {...ALL_WATERED} extras={{ ...extras, plant: null }} />);
    const links = within(more()).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/sounds', '/quiz?topic=t2']);
  });

  it('ripening line: no reminder keeps the count, nothing ripening hides it', () => {
    const { unmount } = renderWithIntl(
      <AllWateredScreen {...ALL_WATERED} ripens={{ time: null, count: 1 }} extras={extras} />,
    );
    expect(screen.getByText('Next ripening: tomorrow · 1 word')).toBeTruthy();
    unmount();
    renderWithIntl(<AllWateredScreen {...ALL_WATERED} ripens={null} extras={extras} />);
    expect(screen.queryByText(/Next ripening/)).toBeNull();
    expect(screen.getByText('3 of 3 missions · Golden Bloom grown')).toBeTruthy();
  });
});

describe('WelcomeBackScreen (A5 / A5b)', () => {
  const card = () => screen.getByRole('heading', { level: 2 }).closest('section') as HTMLElement;

  it('A5: wilting words → Quick revive with a time, Water all instead', () => {
    renderWithIntl(
      <WelcomeBackScreen
        {...COMEBACK}
        start={{
          ...COMEBACK.start,
          href: '/quiz?mode=leech',
          waterAll: { ...COMEBACK.start.waterAll, href: '/review' },
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Start with the 12 wilting words' })).toBeTruthy();
    const links = within(card()).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/quiz?mode=leech', '/review']);
    expect(links[0].textContent).toContain('Quick revive');
    expect(links[0].textContent).toContain('12 words · about 5 min');
    expect(links[1].textContent).toContain('Water all 42 words instead');
  });

  it('A5b: nothing wilting → Quick start with the 10 thirstiest, Water all 45 instead', () => {
    renderWithIntl(
      <WelcomeBackScreen
        {...COMEBACK_START}
        start={{
          ...COMEBACK_START.start,
          href: '/review?limit=10',
          waterAll: { ...COMEBACK_START.start.waterAll, href: '/review' },
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Water the 10 thirstiest words first' })).toBeTruthy();
    const links = within(card()).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/review?limit=10', '/review']);
    expect(links[0].textContent).toContain('Quick start');
    expect(links[0].textContent).toContain('10 words · about 4 min');
    expect(links[1].textContent).toContain('Water all 45 words instead');
    expect(screen.getByRole('img', { name: 'Thirsty garden with a rain cloud' })).toBeTruthy();
  });

  it('A5b short: a few due → Start watering, no second link', () => {
    renderWithIntl(
      <WelcomeBackScreen
        {...COMEBACK_START}
        start={{ kind: 'all', count: 6, minutes: 3, href: '/review', waterAll: null }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Water your 6 thirsty words' })).toBeTruthy();
    const links = within(card()).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Start watering');
    expect(links[0].textContent).toContain('6 words · about 3 min');
  });
});
