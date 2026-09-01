import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { HeatmapEntry } from './heatmap-aggregator';

/**
 * Registered under the `groups` path (not its own `analytics` prefix) so
 * the route reads as `GET /api/v1/groups/:id/heatmap` per
 * `dygo_academy_api_surface.md` — a group-scoped resource, same URL shape
 * as `GroupsController`'s `:id/members` and `:id/invites`. Nest allows two
 * controllers to share a path prefix as long as their routes don't
 * literally collide; this module is kept separate from `GroupsModule`
 * because it owns none of the groups/RBAC domain, only the FR-8.2
 * analytics read.
 */
@ApiBearerAuth()
@ApiTags('analytics')
@Controller({ path: 'groups', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':id/heatmap')
  @ApiOperation({
    summary: 'Class-wide mistake heatmap (FR-8.2)',
    description:
      'ADMIN only. Per-word attempt/failure counts across every member of ' +
      "the group's topics, ranked worst-first by failure rate and capped " +
      'to the top N (`?limit=`, default 20). Backed by ' +
      'public.group_word_heatmap(), a SECURITY DEFINER function — a plain ' +
      'RLS-scoped query cannot serve this at all, since review_logs is ' +
      'owner-only by design (see 007_group_word_heatmap.sql).',
  })
  async heatmap(
    @CurrentUser('id') userId: string,
    @Param('id') groupId: string,
    @Query('limit') limit?: string,
  ): Promise<HeatmapEntry[]> {
    return this.analyticsService.groupHeatmap(userId, groupId, limit ? Number(limit) : undefined);
  }
}
