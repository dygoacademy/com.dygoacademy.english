import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { QUIZ_TYPES, QuizType } from '../quiz-generator';

/**
 * Body for `POST /api/v1/quizzes/generate` (FR-5.1–5.4).
 *
 * No `study_sessions`-style persisted row here either — see
 * `quiz-generator.ts`'s module doc for why a quiz item's id is deterministic
 * and needs no session table to be graded correctly later.
 */
export class GenerateQuizDto {
  @ApiPropertyOptional({
    description: 'Scope to one topic; omit to draw from every READY word the caller can read.',
  })
  @IsOptional()
  @IsUUID('loose')
  topicId?: string;

  @ApiPropertyOptional({
    description: 'Which question types to include. Defaults to all four.',
    enum: QUIZ_TYPES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(QUIZ_TYPES, { each: true })
  types?: QuizType[];

  @ApiPropertyOptional({
    description: 'Max quiz items to return.',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;
}
