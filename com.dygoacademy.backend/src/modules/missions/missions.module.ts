import { Module } from '@nestjs/common';

import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

/** UI-6 U6-2 — daily missions + Golden Bloom. Progress is written by SrsService (missions.store). */
@Module({
  controllers: [MissionsController],
  providers: [MissionsService],
})
export class MissionsModule {}
