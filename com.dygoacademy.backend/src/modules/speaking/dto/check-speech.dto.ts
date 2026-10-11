import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

import { SPEAKING_ACCENTS, SpeakingAccent } from '../speaking.types';

/** Form fields of `POST /speaking/check-speech` (multipart; the recording is the `audio` file). */
export class CheckSpeechDto {
  @ApiProperty({ description: 'The speaking item the learner read (its sentence is checked).' })
  @IsUUID()
  item_id!: string;

  @ApiProperty({ enum: SPEAKING_ACCENTS, description: 'Accent the learner practised.' })
  @IsIn(SPEAKING_ACCENTS)
  accent!: SpeakingAccent;
}
