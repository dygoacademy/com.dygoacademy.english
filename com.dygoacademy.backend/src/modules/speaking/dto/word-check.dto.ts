import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

import { SPEAKING_ACCENTS, SpeakingAccent } from '../speaking.types';

/** Form fields of `POST /speaking/check-pronunciation` (multipart; the recording is the `audio` file). */
export class WordCheckDto {
  @ApiProperty({ description: "The learner's topic_words row for the word they said." })
  @IsUUID('loose')
  topic_word_id!: string;

  @ApiProperty({ enum: SPEAKING_ACCENTS, description: 'Accent the learner practised.' })
  @IsIn(SPEAKING_ACCENTS)
  accent!: SpeakingAccent;
}
