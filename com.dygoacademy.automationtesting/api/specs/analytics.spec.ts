import { authHeader, ApiEnvelope, request } from '../support/client';
import { GROUPS } from '../support/fixtures';

interface HeatmapEntry {
  topic_word_id: string;
  source_word: string;
  topic_id: string;
  topic_title: string;
  attempts: number;
  failures: number;
  failure_rate: number;
}

describe('Module 8 — Analytics & Mistake Heatmaps', () => {
  it('GET /groups/:id/heatmap as the real seeded ADMIN (sarah) returns ranked aggregates, never a user_id', async () => {
    const res = await request.get(`/groups/${GROUPS.ieltsClass}/heatmap`).set(authHeader('sarah'));
    expect(res.status).toBe(200);
    const rows = (res.body as ApiEnvelope<HeatmapEntry[]>).data;

    for (const row of rows) {
      expect(row).not.toHaveProperty('user_id');
      expect(row).not.toHaveProperty('userId');
    }
    // Worst-first ordering.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].failure_rate).toBeGreaterThanOrEqual(rows[i].failure_rate);
    }
  });

  it('GET /groups/:id/heatmap as READ (alex) is forbidden — FR-8.2 is ADMIN only', async () => {
    const res = await request.get(`/groups/${GROUPS.ieltsClass}/heatmap`).set(authHeader('alex'));
    expect(res.status).toBe(403);
  });

  it('GET /groups/:id/heatmap as WRITE (marco, co-teacher) is also forbidden — ADMIN only, not WRITE-and-above', async () => {
    const res = await request.get(`/groups/${GROUPS.ieltsClass}/heatmap`).set(authHeader('marco'));
    expect(res.status).toBe(403);
  });

  it("a non-member of a different tenant (dana) cannot read Oxford's heatmap", async () => {
    const res = await request.get(`/groups/${GROUPS.ieltsClass}/heatmap`).set(authHeader('dana'));
    expect(res.status).toBe(403);
  });

  it('respects the ?limit= cap', async () => {
    const res = await request
      .get(`/groups/${GROUPS.ieltsClass}/heatmap?limit=1`)
      .set(authHeader('sarah'));
    expect(res.status).toBe(200);
    const rows = (res.body as ApiEnvelope<HeatmapEntry[]>).data;
    expect(rows.length).toBeLessThanOrEqual(1);
  });
});
