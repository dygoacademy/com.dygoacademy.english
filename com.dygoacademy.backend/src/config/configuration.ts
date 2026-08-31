export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  database: {
    // Connects as `authenticator`, matching PostgREST, so RLS applies.
    url:
      process.env.DATABASE_URL ??
      'postgresql://authenticator:postgres_password_local_dev@localhost:5432/postgres',
    poolMax: parseInt(process.env.DATABASE_POOL_MAX ?? '20', 10),
    // Superuser connection, used only for DDL the API role must not have:
    // review_logs partition provisioning. Never used to serve a request.
    adminUrl:
      process.env.DATABASE_ADMIN_URL ??
      'postgresql://postgres:postgres_password_local_dev@localhost:5432/postgres',
  },

  supabase: {
    url: process.env.SUPABASE_URL ?? 'http://localhost:8000',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
    jwtAud: 'authenticated',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Module 2 (AI enrichment) — Gemini 1.5 Flash for linguistic extraction and
  // TTS (tech spec §3, §4.2). Empty string, not a thrown error, when unset:
  // EnrichmentProcessor fails individual jobs (topic_word -> FAILED) rather
  // than blocking API boot, since a missing key shouldn't 500 every request.
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  },

  // Module 6 (Web Push & Habit Scheduling) — VAPID identifies this server to
  // the browser's push service (FR-6.5). Empty strings, not a thrown error,
  // when unset — same "degrade, don't block boot" rule as `ai.geminiApiKey`:
  // PushDispatchService no-ops a send rather than failing the whole
  // notification tick when keys are missing in a dev environment.
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:dev@dygo.test',
  },

  // Audio object storage — Cloudflare R2 in production, MinIO locally
  // (docker-compose.yml service `minio`, S3-compatible). R2 env vars take
  // precedence when present; falls back to the MinIO defaults from
  // .env.example otherwise, so a fresh `docker compose up` works with zero
  // config.
  storage: {
    endpoint: process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : (process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000'),
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey:
      process.env.R2_SECRET_ACCESS_KEY ?? process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    bucket: process.env.R2_BUCKET_NAME ?? process.env.MINIO_BUCKET ?? 'dygo-audio',
    region: process.env.STORAGE_REGION ?? 'auto',
    // Public CDN base for the uploaded object's URL. R2's public bucket URL
    // in prod; the MinIO console port locally (browser-playable, not just
    // API-reachable, since audio_url goes straight into <audio src>).
    publicUrl: process.env.R2_PUBLIC_URL ?? 'http://localhost:9000',
    // R2 and most MinIO deployments need path-style addressing
    // (`endpoint/bucket/key`) rather than virtual-hosted-style.
    forcePathStyle: !process.env.R2_ACCOUNT_ID,
  },
});
