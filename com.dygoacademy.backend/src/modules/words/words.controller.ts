import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
      'pipeline; the enriched result lands asynchronously (poll GET ' +
      '/words/:id, not yet built). Requires WRITE role on the topic, ' +
      'enforced by Postgres RLS rather than this controller.',
  })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateWordDto): Promise<TopicWord> {
    return this.wordsService.ingest(userId, dto);
  }
}
