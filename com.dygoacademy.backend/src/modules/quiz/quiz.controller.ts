import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { QuizHint, QuizItem } from './quiz-generator';
import { AnswerResult, QuizService } from './quiz.service';

@ApiBearerAuth()
@ApiTags('quizzes')
@Controller({ path: 'quizzes', version: '1' })
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a quiz batch (FR-5.1–5.4)',
    description:
      'Cloze, Dictation, Matching, and Contextual Choice items drawn from ' +
      "READY words the caller can read. Stateless — an item's id encodes " +
      'enough to grade it later without a persisted quiz/session row; see ' +
      'quiz-generator.ts.',
  })
  async generate(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateQuizDto,
  ): Promise<QuizItem[]> {
    return this.quizService.generate(userId, dto);
  }

  @Get('leech-drill')
  @ApiOperation({
    summary: 'Remedial drill queue (FR-3.3)',
    description:
      "Quiz items built from the caller's leech words (SrsService.findLeeches), " +
      "preferring the richest question type each word's data supports.",
  })
  async leechDrill(@CurrentUser('id') userId: string): Promise<QuizItem[]> {
    return this.quizService.leechDrill(userId);
  }

  @Get(':id/hint')
  @ApiOperation({
    summary: 'On-demand IPA/meaning hint for a stuck TEXT-mode item',
    description:
      "A CLOZE or DICTATION item has no options list to fall back on, so a student who's " +
      "drawn a blank has nothing else on screen to work from (live-requested 2026-09-16). " +
      'Separate from the item payload itself so a hint the student never asked for is never ' +
      'sitting in the initial network response.',
  })
  async hint(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<QuizHint> {
    return this.quizService.hint(userId, id);
  }

  @Post(':id/answer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit an answer (FR-5.5)',
    description:
      'Grades against the item id, and — only on a wrong answer — asks ' +
      'Gemini for a short nuance explanation.',
  })
  async answer(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SubmitAnswerDto,
  ): Promise<AnswerResult> {
    return this.quizService.answer(userId, id, dto);
  }
}
