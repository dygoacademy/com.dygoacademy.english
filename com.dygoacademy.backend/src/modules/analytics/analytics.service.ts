import { ForbiddenException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  DEFAULT_HEATMAP_LIMIT,
  HeatmapEntry,
  TenantHeatmapEntry,
  TenantWordAttemptCounts,
  WordAttemptCounts,
  rankHeatmap,
} from './heatmap-aggregator';

/** Raw row shape from `public.group_word_heatmap()` before bigint→number normalization. */
interface RawHeatmapRow {
  topic_word_id: string;
  source_word: string;
  topic_id: string;
  topic_title: string;
  attempts: string;
  failures: string;
}

/** Raw row shape from `public.tenant_word_heatmap()` before bigint→number normalization. */
interface RawTenantHeatmapRow extends RawHeatmapRow {
  group_id: string;
  group_name: string;
}

/**
 * Module 8 — Analytics & Cohort Heatmaps (Phase 4, FR-8.2). See
 * `SrsService.stats`/`findLeeches` for FR-8.1's per-student half, already
 * shipped in Phase 2 — this module is only the class-wide, ADMIN-facing
 * aggregate.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * FR-8.2's class-wide mistake heatmap. Gated ADMIN via an explicit
   * `has_group_role` check, the same shape
   * `NotificationsService.triggerSprint` uses for its FR-6.2 route (see
   * that method's header comment) — this is a read aggregate with no table
   * row of its own for RLS to filter, so RLS can't be the enforcement
   * point the way it is for, say, `findMembers`.
   *
   * That check is NOT the only gate: `public.group_word_heatmap()`
   * (`007_group_word_heatmap.sql`) re-checks `has_group_role` itself
   * before it bypasses `review_logs_select_own` (owner-only RLS) to
   * compute the aggregate — see that migration's header comment for why
   * the bypass has to exist at all and why it's scoped this narrowly. The
   * check here exists to fail fast with a clean `403` before ever calling
   * a function that touches other students' review history, not because
   * the function would allow it through without this check.
   */
  async groupHeatmap(
    userId: string,
    groupId: string,
    limit: number = DEFAULT_HEATMAP_LIMIT,
  ): Promise<HeatmapEntry[]> {
    const [{ allowed }] = await this.db.queryAs<{ allowed: boolean }>(
      userId,
      `select public.has_group_role($1, 'ADMIN') as allowed`,
      [groupId],
    );
    if (!allowed) {
      throw new ForbiddenException('Only a group ADMIN can view the mistake heatmap.');
    }

    const rows = await this.db.queryAs<RawHeatmapRow>(
      userId,
      `select topic_word_id, source_word, topic_id, topic_title, attempts, failures
         from public.group_word_heatmap($1)`,
      [groupId],
    );

    // pg returns the function's bigint columns (attempts/failures) as
    // strings — normalize before handing off to the pure ranking function,
    // same reasoning SrsService.stats casts Number(...) on its count(*) columns.
    const normalized: WordAttemptCounts[] = rows.map((row) => ({
      topic_word_id: row.topic_word_id,
      source_word: row.source_word,
      topic_id: row.topic_id,
      topic_title: row.topic_title,
      attempts: Number(row.attempts),
      failures: Number(row.failures),
    }));

    return rankHeatmap(normalized, limit);
  }

  /**
   * FR-8.2 "across cohorts" — the tenant-wide widening of `groupHeatmap`
   * above. Deliberately takes no `tenantId` parameter from the caller: the
   * only tenant a director rollup can ever mean is the caller's own, and
   * accepting an id from the request would just be an unnecessary input to
   * validate for no real capability (a caller who isn't `is_tenant_admin()`
   * of a tenant is rejected either way — see `010_tenant_word_heatmap.sql`'s
   * own re-check). `current_user_tenant_id()` is resolved inside the same
   * RLS-scoped query as the admin check so both come from one round trip.
   *
   * Same defense-in-depth shape as `groupHeatmap`: the check here exists to
   * fail fast with a clean `403` before calling a function that reads past
   * `review_logs_select_own` for an entire tenant's worth of classes, not
   * because `tenant_word_heatmap()` would allow it through without this
   * check — that function re-checks `is_tenant_admin()` itself.
   */
  async tenantHeatmap(
    userId: string,
    limit: number = DEFAULT_HEATMAP_LIMIT,
  ): Promise<TenantHeatmapEntry[]> {
    const [{ tenant_id: tenantId, allowed }] = await this.db.queryAs<{
      tenant_id: string | null;
      allowed: boolean;
    }>(
      userId,
      `select public.current_user_tenant_id() as tenant_id,
              public.is_tenant_admin(public.current_user_tenant_id()) as allowed`,
      [],
    );
    if (!tenantId || !allowed) {
      throw new ForbiddenException(
        'Only a tenant admin can view the academy-wide mistake heatmap.',
      );
    }

    const rows = await this.db.queryAs<RawTenantHeatmapRow>(
      userId,
      `select group_id, group_name, topic_word_id, source_word, topic_id, topic_title, attempts, failures
         from public.tenant_word_heatmap($1)`,
      [tenantId],
    );

    // Same bigint-as-string normalization as groupHeatmap above.
    const normalized: TenantWordAttemptCounts[] = rows.map((row) => ({
      group_id: row.group_id,
      group_name: row.group_name,
      topic_word_id: row.topic_word_id,
      source_word: row.source_word,
      topic_id: row.topic_id,
      topic_title: row.topic_title,
      attempts: Number(row.attempts),
      failures: Number(row.failures),
    }));

    return rankHeatmap(normalized, limit);
  }
}
