import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JobSchedulerService } from './job-scheduler.service';
import {
  ENRICHMENT_QUEUE,
  MAINTENANCE_QUEUE,
  NOTIFICATION_QUEUE,
} from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password'),
        },
        defaultJobOptions: {
          attempts: 3,
          // Gemini/TTS rate limits are the expected failure; backing off
          // exponentially avoids hammering a quota that is already exhausted.
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86_400 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: ENRICHMENT_QUEUE },
      { name: NOTIFICATION_QUEUE },
      { name: MAINTENANCE_QUEUE },
    ),
  ],
  providers: [JobSchedulerService],
  exports: [BullModule],
})
export class QueuesModule {}
