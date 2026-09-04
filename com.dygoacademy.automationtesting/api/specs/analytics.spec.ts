import { authHeader, ApiEnvelope, request } from '../support/client';
import { GROUPS, TENANTS } from '../support/fixtures';

interface HeatmapEntry {
  topic_word_id: string;
  source_word: string;
  topic_id: string;
  topic_title: string;
  attempts: number;
  failures: number;
  failure_rate: number;
}

interface TenantHeatmapEntry extends HeatmapEntry {
  group_id: string;
  group_name: string;
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

describe('Module 8 — tenant-wide mistake heatmap (010, FR-8.2 "across cohorts")', () => {
  it('GET /analytics/tenant/heatmap as the real seeded tenant admin (sarah) returns the same aggregate as her single-group heatmap, attributed to that group', async () => {
    const [tenantRes, groupRes] = await Promise.all([
      request.get('/analytics/tenant/heatmap').set(authHeader('sarah')),
      request.get(`/groups/${GROUPS.ieltsClass}/heatmap`).set(authHeader('sarah')),
    ]);
    expect(tenantRes.status).toBe(200);
    expect(groupRes.status).toBe(200);

    const tenantRows = (tenantRes.body as ApiEnvelope<TenantHeatmapEntry[]>).data;
    const groupRows = (groupRes.body as ApiEnvelope<HeatmapEntry[]>).data;

    // Only ieltsClass has seeded review activity (publicAwl has none), so the
    // tenant-wide total should equal the single-group total exactly — proof
    // the widening doesn't double-count or drop rows, not just that it
    // returns *something*.
    expect(tenantRows).toHaveLength(groupRows.length);
    const tenantAttempts = tenantRows.reduce((sum, r) => sum + r.attempts, 0);
    const groupAttempts = groupRows.reduce((sum, r) => sum + r.attempts, 0);
    expect(tenantAttempts).toBe(groupAttempts);

    for (const row of tenantRows) {
      expect(row.group_id).toBe(GROUPS.ieltsClass);
      expect(row).not.toHaveProperty('user_id');
      expect(row).not.toHaveProperty('userId');
    }
    for (let i = 1; i < tenantRows.length; i++) {
      expect(tenantRows[i - 1].failure_rate).toBeGreaterThanOrEqual(tenantRows[i].failure_rate);
    }
  });

  it('GET /analytics/tenant/heatmap as WRITE-only (marco, co-teacher — not ADMIN anywhere) is forbidden', async () => {
    const res = await request.get('/analytics/tenant/heatmap').set(authHeader('marco'));
    expect(res.status).toBe(403);
  });

  it('GET /analytics/tenant/heatmap as READ (alex) is forbidden', async () => {
    const res = await request.get('/analytics/tenant/heatmap').set(authHeader('alex'));
    expect(res.status).toBe(403);
  });

  it("a real tenant admin of a DIFFERENT tenant (dana, Rival Academy ADMIN) sees only her own tenant's rollup, never Oxford's — the endpoint takes no tenantId param, so this also proves it can't be pointed at another tenant", async () => {
    const res = await request.get('/analytics/tenant/heatmap').set(authHeader('dana'));
    // Dana is a genuine tenant admin — of Rival Academy, which has no
    // review_logs activity in the seed data — so this is 200 with an empty
    // rollup, not a 403. A 403 here would actually be the wrong behavior:
    // Dana is asking about her own tenant, which she legitimately can see.
    expect(res.status).toBe(200);
    const rows = (res.body as ApiEnvelope<TenantHeatmapEntry[]>).data;
    for (const row of rows) {
      expect(row.group_id).not.toBe(GROUPS.ieltsClass);
    }
    expect(TENANTS.oxford).not.toBe(TENANTS.rival); // sanity: distinct tenants, not a typo'd fixture
  });
});
