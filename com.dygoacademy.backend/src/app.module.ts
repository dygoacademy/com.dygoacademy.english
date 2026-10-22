import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AiModule } from './ai/ai.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SupabaseJwtGuard } from './common/guards/supabase-jwt.guard';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BedsModule } from './modules/beds/beds.module';
import { BillingModule } from './modules/billing/billing.module';
import { GroupsModule } from './modules/groups/groups.module';
import { MissionsModule } from './modules/missions/missions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { SpeakingModule } from './modules/speaking/speaking.module';
import { SrsModule } from './modules/srs/srs.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { TopicsModule } from './modules/topics/topics.module';
import { VoiceDonationModule } from './modules/voice-donation/voice-donation.module';
import { WordsModule } from './modules/words/words.module';
import { QueuesModule } from './queues/queues.module';
import { StorageModule } from './storage/storage.module';
import { EnrichmentProcessor } from './workers/enrichment.processor';
import { MaintenanceProcessor } from './workers/maintenance.processor';
import { NotificationProcessor } from './workers/notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      // Read the repo-root .env so the API and docker-compose share one file.
      envFilePath: ['../.env', '.env'],
    }),
    DatabaseModule,
    AiModule,
    StorageModule,
    QueuesModule,
    HealthModule,
    GroupsModule,
    TopicsModule,
    WordsModule,
    SrsModule,
    QuizModule,
    BillingModule,
    NotificationsModule,
    AnalyticsModule,
    ProfilesModule,
    MissionsModule,
    BedsModule,
    SpeakingModule,
    TelemetryModule,
    VoiceDonationModule,
  ],
  providers: [
    EnrichmentProcessor,
    NotificationProcessor,
    MaintenanceProcessor,
    // Authentication is global and opt-OUT via @Public(), not opt-in. A new
    // controller added six months from now is protected by default; forgetting
    // a decorator can only ever make a route too strict, never too open.
    { provide: APP_GUARD, useClass: SupabaseJwtGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
