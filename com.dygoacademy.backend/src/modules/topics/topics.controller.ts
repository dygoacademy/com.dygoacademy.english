import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TopicsService, TopicSummary } from './topics.service';

@ApiBearerAuth()
@ApiTags('topics')
@Controller({ path: 'topics', version: '1' })
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ApiOperation({
    summary: 'List topics visible to the caller',
    description:
      'Returns public topics plus any private topic in a group the caller ' +
      'belongs to. Filtering is performed by PostgreSQL Row-Level Security, ' +
      'not by this endpoint.',
  })
  async findAll(@CurrentUser('id') userId: string): Promise<TopicSummary[]> {
    return this.topicsService.findAllVisible(userId);
  }
}
