import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

/** Body for `POST /api/v1/quizzes/:id/answer` (FR-5.1–5.5). */
export class SubmitAnswerDto {
  @ApiProperty({
    description: "The student's submitted answer (typed text, or the chosen option's exact label).",
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  answer!: string;

  @ApiPropertyOptional({
    description: 'Client-measured response time in ms, for future analytics (FR-8.x).',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  responseMs?: number;

  @ApiPropertyOptional({
    description:
      'Whether the student opened the IPA/meaning hint (GET /quizzes/:id/hint) before ' +
      'submitting this answer. Echoed back on AnswerResult, not yet used for grading or ' +
      'SRS scheduling — see AnswerResult.hintUsed.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hintUsed?: boolean;

  @ApiPropertyOptional({
    description:
      "The learner's app language (UI-L codes). On a wrong answer the nuance explanation is " +
      'written in it (Vietnamese / Simplified Chinese); English or omitted = English. ' +
      'The classic app never sends it.',
    enum: ['en-SG', 'en-US', 'vi-VN', 'zh-CN', 'en', 'vi', 'zh'],
  })
  @IsOptional()
  @IsIn(['en-SG', 'en-US', 'vi-VN', 'zh-CN', 'en', 'vi', 'zh'])
  locale?: string;
}
