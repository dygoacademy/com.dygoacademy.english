import { create } from 'zustand';

/**
 * Active study-session state (current card, streak, session rating queue).
 * Scaffolded in Phase 0 to establish the use[Domain]Store.ts convention
 * (tech spec §3.3); the SRS player that populates this lands in Phase 2
 * alongside src/components/flashcard.
 *
 * Zustand owns transient, client-only session state; TanStack Query
 * (see QueryProvider) owns anything that came from — or needs to be synced
 * back to — the API. Don't duplicate server data into this store.
 */
interface StudySessionState {
  activeTopicId: string | null;
  cardIndex: number;
  setActiveTopic: (topicId: string | null) => void;
  nextCard: () => void;
  reset: () => void;
}

export const useStudySessionStore = create<StudySessionState>((set) => ({
  activeTopicId: null,
  cardIndex: 0,
  setActiveTopic: (topicId) => set({ activeTopicId: topicId, cardIndex: 0 }),
  nextCard: () => set((state) => ({ cardIndex: state.cardIndex + 1 })),
  reset: () => set({ activeTopicId: null, cardIndex: 0 }),
}));
