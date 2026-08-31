import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { WordsService } from './words.service';

@ApiBearerAuth()
@ApiTags('words')
@Controller({ path: 'words', version: '1' })
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}
}
