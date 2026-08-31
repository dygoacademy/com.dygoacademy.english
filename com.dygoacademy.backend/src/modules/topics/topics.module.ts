import { Module } from '@nestjs/common';

import { SrsModule } from '../srs/srs.module';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

// Imports SrsModule for one reason: GET /topics/:id/cards/due (tech spec
// §3.4's route shape) lives on TopicsController, not SrsController, but the
// due-card query itself is Module 3's — see SrsService.findDue. Rather than
// duplicate that query here, TopicsController just injects SrsService.
@Module({
  imports: [SrsModule],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
