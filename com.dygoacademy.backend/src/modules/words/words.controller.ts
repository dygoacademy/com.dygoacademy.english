import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateWordDto } from './dto/create-word.dto';
import { TopicWord, WordsService } from './words.service';

@ApiBearerAuth()
@ApiTags('words')
@Controller({ path: 'words', version: '1' })
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ingest a word for AI enrichment',
    description:
      'Inserts the word with status ENRICHING and enqueues the Gemini/TTS ' +
      'pipeline; the enriched result lands asynchronously and is picked up ' +
      'by polling GET /topics/:id (useTopic.ts, 2.5s while any word is ' +
      'still ENRICHING). Requires WRITE role on the topic, enforced by ' +
      'Postgres RLS rather than this controller.',
  })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateWordDto): Promise<TopicWord> {
    return this.wordsService.ingest(userId, dto);
  }

  @Post(':id/re-enrich')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry enrichment for a FAILED word',
    description:
      'The "Try again" action on the FAILED word state (wireframe 1l). ' +
      'Only succeeds when the word is currently FAILED — 404 otherwise, ' +
      'the same response RLS-hidden or nonexistent ids already get ' +
      'elsewhere in this codebase. Requires WRITE role on the topic ' +
      '(topic_words_update_write), enforced by Postgres RLS.',
  })
  async reEnrich(
    @CurrentUser('id') userId: string,
    @Param('id') topicWordId: string,
  ): Promise<TopicWord> {
    return this.wordsService.reEnrich(userId, topicWordId);
  }
}
