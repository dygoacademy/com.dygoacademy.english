import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { TenantHeatmapEntry } from './heatmap-aggregator';

/**
 * `dygo_academy_api_surface.md` §4 originally guessed `GET /analytics/tenant`
 * for a broader, still-unbuilt "institution-wide retention reports" persona
 * table (FR-8.1-shaped). This route ships the narrower, already-specified
 * FR-8.2 "across cohorts" scope instead — the tenant-wide widening of
 * `AnalyticsController`'s `GET /groups/:id/heatmap` — under
 * `/analytics/tenant/heatmap` so the two don't collide if the broader
 * persona-table endpoint is ever built later. Kept in its own controller
 * (rather than folded into `AnalyticsController`, which is registered under
 * the `groups` path prefix) because this route is tenant-scoped, not
 * group-scoped, and takes no `:id` — see `AnalyticsService.tenantHeatmap`
 * for why the tenant is always the caller's own, never a request param.
 */
@ApiBearerAuth()
@ApiTags('analytics')
@Controller({ path: 'analytics', version: '1' })
export class TenantAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('tenant/heatmap')
  @ApiOperation({
    summary: "Academy-wide mistake heatmap across every class in the caller's tenant (FR-8.2)",
    description:
      'Tenant admin only (is_tenant_admin() — ADMIN of any group in the ' +
      'tenant, see 009_tenant_admin_read_expansion.sql). Per-word ' +
      'attempt/failure counts across every group/topic in the tenant, each ' +
      'row attributed to its class (`group_id`/`group_name`), ranked ' +
      'worst-first by failure rate and capped to the top N (`?limit=`, ' +
      'default 20). Backed by public.tenant_word_heatmap() — see ' +
      '010_tenant_word_heatmap.sql for why this needs a SECURITY DEFINER ' +
      'function rather than a plain RLS-scoped query.',
  })
  async tenantHeatmap(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ): Promise<TenantHeatmapEntry[]> {
    return this.analyticsService.tenantHeatmap(userId, limit ? Number(limit) : undefined);
  }
}
