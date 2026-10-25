import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@ApiBearerAuth()
@ApiTags('events')
@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Record one analytics event (pronunciation v2, 2026-10-25)',
    description:
      'One of the pron_* events with its own props, saved to product_events as the learner. ' +
      'Unknown props, or values that are not short text, numbers, true/false or null, are refused (400).',
  })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateEventDto): Promise<void> {
    await this.events.record(userId, dto.name, dto.props);
  }
}
