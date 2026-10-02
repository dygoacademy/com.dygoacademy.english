import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { EmptyState } from './EmptyState';
import { BED } from './screens/fixtures';
import { SharedGardensScreen } from './screens/SharedGardensScreen';
import { TopicBedScreen } from './screens/TopicBedScreen';
import { TopicsScreen } from './screens/TopicsScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

/** UI-3 U3-1: the shared empty state and the screens that use it. */
describe('EmptyState', () => {
  it('renders one quiet line without a title, as the requested tag', () => {
    const { container } = renderWithIntl(
      <ul>
        <EmptyState as="li" body="Nothing yet" />
      </ul>,
    );
    const item = container.querySelector('li')!;
    expect(item.textContent).toBe('Nothing yet');
    expect(item.className).toContain('text-muted-foreground');
  });

  it('renders a card with title, body and action', () => {
    renderWithIntl(
      <EmptyState title="Empty" body="Plant something" action={<button>Go</button>} />,
    );
    expect(screen.getByText('Empty').className).toContain('font-bold');
    expect(screen.getByText('Plant something')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
  });
});

describe('empty screens', () => {
  it('Topics with no beds', () => {
    renderWithIntl(<TopicsScreen topics={[]} filters={[]} lockedPack={null} />);
    expect(screen.getByText('No beds yet. Plant your first one below.')).toBeTruthy();
  });

  it('Topic bed with no words says the bed is empty, not the stage', () => {
    renderWithIntl(
      <TopicBedScreen
        {...BED}
        words={[]}
        backHref="/garden/topics"
        water={{ count: 0, href: '/garden/review' }}
        quizHref="/quiz"
        addWordHref="/add"
      />,
    );
    expect(screen.getByText('This bed is empty. Add your first word to plant it.')).toBeTruthy();
    expect(screen.queryByText('No words at this stage yet.')).toBeNull();
  });

  it('Groups with no shared gardens', () => {
    renderWithIntl(
      <SharedGardensScreen
        gardens={[]}
        gardeners={0}
        rainDay={null}
        start={{ onClick: vi.fn() }}
        join={{ onClick: vi.fn() }}
      />,
    );
    expect(screen.getByText('No shared gardens yet')).toBeTruthy();
  });
});
