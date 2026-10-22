import { Module } from '@nestjs/common';

import { BedsController } from './beds.controller';
import { BedsService } from './beds.service';

/** Seeds & Harvest Phase 1: active bed, S2 Bed harvest, S3 seed packets. */
@Module({
  controllers: [BedsController],
  providers: [BedsService],
})
export class BedsModule {}
