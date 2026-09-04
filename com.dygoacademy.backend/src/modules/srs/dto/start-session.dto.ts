import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

const MODES = ['STANDARD', 'REVERSE', 'LISTENING'] as const;
export type SessionMode = (typeof MODES)[number];

/**
 * Body for `POST /api/v1/srs/sessions` — FR-4.3's three study modes.
 *
 * There is no `study_sessions` table in the schema (checked
 * `dygo_academy_database_dictionary.md` — Module 4's modes are a *display*
 * concern: which face of the card shows first and whether audio is the only
 * clue. So this endpoint does not create a persisted session row; it hands
 * back a batch of due cards tagged with the requested mode, and the mode
 * itself is echoed back for the frontend to key its rendering off of. If a
 * real session-resume feature is wanted later, add the table then — nothing
 * here would need to change shape, just gain a `session_id`.
 */
export class StartSessionDto {
  @ApiPropertyOptional({ description: 'Scope the session to one topic; omit for all due cards.' })
  @IsOptional()
  @IsUUID('loose')
  topicId?: string;

  @ApiPropertyOptional({ enum: MODES, default: 'STANDARD' })
  @IsOptional()
  @IsIn(MODES)
  mode?: SessionMode;

  @ApiPropertyOptional({ description: 'Cards per session.', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
