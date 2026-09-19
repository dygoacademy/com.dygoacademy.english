import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateWordDto } from './dto/create-word.dto';
import { GuestWordLookupDto } from './dto/guest-word-lookup.dto';
import { GuestWordCard, TopicWord, WordCard, WordsService } from './words.service';

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

  // Registered ahead of `@Get(':id')` on purpose: NestJS/Express matches
  // routes in declaration order, and ':id' matches literally any single
  // path segment -- including the literal string "guest-lookup" -- so
  // this would 404 as "word not found" if it came after getCard() below.
  @Public()
  @Get('guest-lookup')
  @ApiOperation({
    summary: 'Look up one already-enriched word for an unauthenticated guest',
    description:
      'Backs the public landing page\'s "try a word before you sign up" ' +
      'flow (GuestWordTrial.tsx). Only reads master_lexicon -- unlike ' +
      'POST /words, it never enqueues a Gemini/TTS enrichment job, so a ' +
      'guest can only find words this app has already enriched for ' +
      'someone else. 404 means "not cached yet," which the frontend turns ' +
      'into a prompt to create a free account rather than a raw error.',
  })
  async guestLookup(@Query() query: GuestWordLookupDto): Promise<GuestWordCard> {
    return this.wordsService.lookupGuestWord(query.word, query.languageCode);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Get one word's full card content",
    description:
      'Powers clicking a READY word in the topic list to flip its ' +
      'flashcard right there, independent of whether it is actually due ' +
      'for SRS review (contrast GET /srs/due). 404 if the word does not ' +
      'exist or is not visible to this caller under RLS.',
  })
  async getCard(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<WordCard> {
    return this.wordsService.getCard(userId, id);
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a word from its topic',
    description:
      'Requires WRITE on the topic (topic_words_delete_write). The trash ' +
      'icon on each word row in the topic detail page (WordStatusRow.tsx).',
  })
  async remove(@CurrentUser('id') userId: string, @Param('id') topicWordId: string): Promise<void> {
    await this.wordsService.remove(userId, topicWordId);
  }
}
