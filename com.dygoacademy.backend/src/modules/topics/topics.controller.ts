import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CloneTopicDto } from './dto/clone-topic.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicDetail, TopicRow, TopicsService, TopicSummary } from './topics.service';

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a topic',
    description: 'Requires WRITE on the target group (topics_insert_write).',
  })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateTopicDto): Promise<TopicRow> {
    return this.topicsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Topic detail, with words',
    description: 'Public topic, or any topic in a group the caller can read.',
  })
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') topicId: string,
  ): Promise<TopicDetail> {
    return this.topicsService.findById(userId, topicId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename, re-describe, or toggle visibility',
    description: "Requires WRITE on the topic's group (topics_update_write).",
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') topicId: string,
    @Body() dto: UpdateTopicDto,
  ): Promise<TopicRow> {
    return this.topicsService.update(userId, topicId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a topic',
    description:
      'ADMIN only (topics_delete_admin) — tech spec §4.1: WRITE explicitly cannot delete a topic.',
  })
  async remove(@CurrentUser('id') userId: string, @Param('id') topicId: string): Promise<void> {
    await this.topicsService.remove(userId, topicId);
  }

  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Clone a public topic',
    description:
      'FR-1.1: "public topics are searchable, cloneable." Copies the ' +
      "source topic's words (reusing resolved master_lexicon entries) into " +
      'a new, private-by-default topic under targetGroupId. Requires WRITE there.',
  })
  async clone(
    @CurrentUser('id') userId: string,
    @Param('id') topicId: string,
    @Body() dto: CloneTopicDto,
  ): Promise<TopicRow> {
    return this.topicsService.clone(userId, topicId, dto.targetGroupId);
  }
}
