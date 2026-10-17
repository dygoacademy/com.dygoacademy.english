import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let topics: unknown[] | undefined;
let groups: unknown[] | undefined;
vi.mock('@/hooks/useTopics', () => ({ useTopics: () => ({ data: topics }) }));
vi.mock('@/hooks/useGroups', () => ({ useGroups: () => ({ data: groups }) }));

import { useAddWordBeds, useBedTitle, useSaveToMyWords } from './useSaveToMyWords';

const save = (topicId: string) => renderHook(() => useSaveToMyWords(topicId)).result.current;

describe('useSaveToMyWords', () => {
  it('saves to My words on beds the learner cannot edit', () => {
    topics = [
      { id: 'lib', kind: 'library', group_id: 'g-lib' },
      { id: 'read', kind: 'group', group_id: 'g-read' },
      { id: 'write', kind: 'group', group_id: 'g-write' },
      { id: 'own', kind: 'mine', group_id: 'g-own' },
      { id: 'mw', kind: 'mine', group_id: 'g-own', is_my_words: true },
    ];
    groups = [
      { id: 'g-read', role: 'READ' },
      { id: 'g-write', role: 'WRITE' },
    ];
    expect(save('lib')).toBe(true);
    expect(save('read')).toBe(true);
    expect(save('write')).toBe(false);
    expect(save('own')).toBe(false);
    expect(save('mw')).toBe(false);
  });

  it('keeps + as before while the lists load', () => {
    topics = undefined;
    groups = undefined;
    expect(save('lib')).toBe(false);
    topics = [{ id: 'read', kind: 'group', group_id: 'g-read' }];
    expect(save('read')).toBe(false);
  });

  it('names My words from the topics list, other beds from the bed itself', () => {
    topics = [
      { id: 'mw', title: 'Từ của tôi', is_my_words: true },
      { id: 'b', title: 'Old name' },
    ];
    expect(renderHook(() => useBedTitle('mw', 'My words')).result.current).toBe('Từ của tôi');
    expect(renderHook(() => useBedTitle('b', 'New name')).result.current).toBe('New name');
  });

});

describe('useAddWordBeds (A7b bed chips)', () => {
  const beds = (topicId: string, title: string) =>
    renderHook(() => useAddWordBeds(topicId, title, 'My words')).result.current;

  it('lists this bed, My words, then the other beds the learner can add to', () => {
    topics = [
      { id: 'lib', title: 'IELTS', kind: 'library', group_id: 'g-lib' },
      { id: 'read', title: 'Class', kind: 'group', group_id: 'g-read' },
      { id: 'write', title: 'Team', kind: 'group', group_id: 'g-write' },
      { id: 'own', title: 'Travel', kind: 'mine', group_id: 'g-own' },
      { id: 'mw', title: 'Từ của tôi', kind: 'mine', group_id: 'g-own', is_my_words: true },
    ];
    groups = [
      { id: 'g-read', role: 'READ' },
      { id: 'g-write', role: 'WRITE' },
    ];
    expect(beds('own', 'Travel')).toEqual([
      { id: 'own', title: 'Travel' },
      { id: 'mw', title: 'Từ của tôi' },
      { id: 'write', title: 'Team' },
    ]);
    // A bed the learner can't edit isn't a chip; My words comes first.
    expect(beds('lib', 'IELTS').map((b) => b.id)).toEqual(['mw', 'write', 'own']);
  });

  it('offers My words before the learner has that bed, and nothing while loading', () => {
    topics = [{ id: 'own', title: 'Travel', kind: 'mine', group_id: 'g-own' }];
    groups = [];
    expect(beds('own', 'Travel')).toEqual([
      { id: 'own', title: 'Travel' },
      { id: null, title: 'My words' },
    ]);
    topics = undefined;
    expect(beds('own', 'Travel')).toEqual([]);
  });
});
