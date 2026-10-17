import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { TopicSearchScreen, type SearchTopic } from './TopicSearchScreen';

const LONG = 'Environment, climate change and sustainable development';
const topic = (id: string, planted: boolean): SearchTopic => ({
  id,
  href: `/topics/${id}`,
  title: LONG,
  group: null,
  level: 'B2',
  words: 40,
  stages: { tree: 0, flower: 0, sprout: 4 },
  due: planted ? 6 : null,
  collection: planted ? null : 'IELTS Academic',
  planted,
});

describe('TopicSearchScreen (A6b)', () => {
  it('clamps long names to 2 lines on both lists, highlight inside the clamp', () => {
    renderWithIntl(
      <TopicSearchScreen
        query="climate"
        onQueryChange={() => {}}
        cancelHref="/topics"
        yours={[topic('mine', true)]}
        more={[topic('lib', false)]}
        plantHref={() => '/review?new=5&topic=lib'}
        wordHint={null}
        recent={[]}
        onRecent={() => {}}
      />,
    );
    const titles = screen.getAllByTitle(LONG);
    expect(titles).toHaveLength(2);
    for (const title of titles) {
      expect(title.className).toContain('line-clamp-2');
      expect(title.className).toContain('min-w-0');
      expect(title.querySelector('.bg-gold-light')?.textContent).toBe('climate');
    }
    const plant = screen.getByRole('link', { name: `Plant ${LONG}` });
    expect(plant.className).toContain('shrink-0');
    expect(plant.previousElementSibling?.lastElementChild?.className).toContain('truncate');
  });
});
