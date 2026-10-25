import { Module } from '@nestjs/common';

import { EventsController } from './events.controller';
import { EventsService } from './events.service';

/** Pronunciation v2 analytics: POST /events → product_events. */
@Module({
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
