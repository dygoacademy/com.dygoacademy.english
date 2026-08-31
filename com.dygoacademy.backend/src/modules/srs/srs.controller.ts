import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { SrsService } from './srs.service';

@ApiBearerAuth()
@ApiTags('srs')
@Controller({ path: 'srs', version: '1' })
export class SrsController {
  constructor(private readonly srsService: SrsService) {}
}
