import { Module } from '@nestjs/common';

import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

/** Option 2 (2026-10-04): audio load times from learners' phones. */
@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService],
})
export class TelemetryModule {}
