import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // /api/v1/... per tech spec §3.4.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Reject unknown properties outright rather than silently dropping them:
      // a client sending `{ role: 'ADMIN' }` to an endpoint that does not
      // accept it should get a 400, not a quietly ignored field.
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: config.get<string>('frontendUrl', 'http://localhost:3000'),
    credentials: true,
  });

  const swagger = new DocumentBuilder()
    .setTitle('Dygo Academy API')
    .setDescription(
      'AI-enriched collaborative vocabulary platform. All endpoints require a ' +
        'Supabase access token unless marked public.',
    )
    .setVersion('0.1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Supabase access token',
    })
    .addTag('health')
    .addTag('topics', 'Module 1 — groups, topics & RBAC')
    .addTag('words', 'Module 2 — ingestion & AI enrichment')
    .addTag('srs', 'Module 3 — error-adaptive spaced repetition')
    .addTag('notifications', 'Module 6 — push & habit scheduling')
    .addTag('billing', 'Module 7 — seat subscriptions')
    .build();

  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swagger),
    { swaggerOptions: { persistAuthorization: true } },
  );

  const port = config.get<number>('port', 3001);
  await app.listen(port);

  logger.log(`API      → http://localhost:${port}/api/v1`);
  logger.log(`Swagger  → http://localhost:${port}/api/docs`);
  logger.log(`Health   → http://localhost:${port}/api/v1/health`);
}

void bootstrap();
