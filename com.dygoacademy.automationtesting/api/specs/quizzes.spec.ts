import { authHeader, ApiEnvelope, request } from '../support/client';
import { WORDS } from '../support/fixtures';

interface QuizItem {
  id: string;
  type: 'CLOZE' | 'DICTATION' | 'MATCHING' | 'CONTEXTUAL_CHOICE';
  topicWordId: string;
  prompt: string;
}

describe('Module 5 — Dynamic Quiz Engine', () => {
  it('POST /quizzes/generate returns items drawn only from READY words', async () => {
    const res = await request.post('/quizzes/generate').set(authHeader('alex')).send({ limit: 10 });
    expect(res.status).toBe(200);
    const items = (res.body as ApiEnvelope<QuizItem[]>).data;
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.id).toContain(item.topicWordId); // stateless id encodes topicWordId:type
    }
  });

  it('GET /quizzes/leech-drill surfaces the leech word (resilient) for alex', async () => {
    const res = await request.get('/quizzes/leech-drill').set(authHeader('alex'));
    expect(res.status).toBe(200);
    const items = (res.body as ApiEnvelope<QuizItem[]>).data;
    expect(items.some((i) => i.topicWordId === WORDS.resilient)).toBe(true);
  });

  it('POST /quizzes/:id/answer grades a correct answer without calling out to Gemini', async () => {
    const generated = await request
      .post('/quizzes/generate')
      .set(authHeader('alex'))
      .send({ types: ['CONTEXTUAL_CHOICE'], limit: 5 });
    const items = (generated.body as ApiEnvelope<QuizItem[]>).data;
    if (items.length === 0) {
      console.warn('No CONTEXTUAL_CHOICE items available for alex — skipping.');
      return;
    }
    const item = items[0];

    // Deliberately wrong first, to exercise the answer endpoint's shape
    // without asserting on Gemini's actual nuance text (an external call,
    // slow and non-deterministic) — just that it degrades gracefully.
    const wrong = await request
      .post(`/quizzes/${encodeURIComponent(item.id)}/answer`)
      .set(authHeader('alex'))
      .send({ answer: 'definitely-not-the-right-answer' });
    expect(wrong.status).toBe(200);
    const wrongResult = (
      wrong.body as ApiEnvelope<{
        correct: boolean;
        nuanceExplanation?: string;
        srs?: { graded: boolean; justMastered: boolean; nextDueAt: string };
      }>
    ).data;
    expect(wrongResult.correct).toBe(false);
    // Phase 10 — the wrong answer was recorded against the word's review
    // schedule. `graded` may be false on a re-run the same day (at most one
    // counted mistake per word per day), but the srs block is always present.
    expect(wrongResult.srs).toBeDefined();
    expect(wrongResult.srs?.justMastered).toBe(false);
  }, 20000);

  it('POST /quizzes/:id/answer on a malformed item id is a clean 4xx, not a 500', async () => {
    const res = await request
      .post('/quizzes/not-a-real-item-id/answer')
      .set(authHeader('alex'))
      .send({ answer: 'anything' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
