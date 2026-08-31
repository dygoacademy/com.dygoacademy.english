import { Module } from '@nestjs/common';

import { SrsModule } from '../srs/srs.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

/**
 * Module 5 — Dynamic Multi-Modal Quiz Engine (Phase 3). Imports SrsModule
 * for `leech-drill` (FR-3.3), same pattern TopicsModule uses to reach
 * `SrsService.findDue` for `GET /topics/:id/cards/due`. GeminiEnrichmentService
 * needs no import here — AiModule is @Global().
 */
@Module({
  imports: [SrsModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
