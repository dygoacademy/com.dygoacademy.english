import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

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
}
