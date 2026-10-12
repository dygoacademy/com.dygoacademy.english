import { storageConfigFrom } from './storage-config';

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

  // Phase 13 G6: the speech scorer (docker/speech, container dygo_speech) on
  // this Mac. Only the backend calls it (127.0.0.1); `POST /speaking/check-speech`
  // forwards a recording and gives up after timeoutMs (SP3 shows "Couldn't
  // check"). Unset = the local default; the scorer being down is a 503 per
  // request, not a boot failure.
  // Phase 13 S13: daily caps on paid Google APIs (src/ai/usage-cap.service.ts,
  // table api_usage_daily, UTC days). Gemini counts calls (enrichment,
  // translation, word audio, quiz explanations); Google Cloud TTS counts
  // characters (scripts/speaking-generate.ts). Over the cap the call is
  // skipped, not made.
  usage: {
    geminiDailyCalls: parseInt(process.env.GEMINI_DAILY_CALL_LIMIT || '1000', 10),
    googleTtsDailyChars: parseInt(process.env.GOOGLE_TTS_DAILY_CHAR_LIMIT || '300000', 10),
  },

  speech: {
    // Queue v1 (2026-10-06): every scorer the worker may use, comma-separated
    // (one is fine); one check at a time each. The single SPEECH_SCORER_URL
    // was removed 2026-10-07.
    scorerUrls: (process.env.SPEECH_SCORER_URLS || 'http://127.0.0.1:8100')
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean),
    timeoutMs: parseInt(process.env.SPEECH_CHECK_TIMEOUT_MS || '8000', 10),
    // Above this estimated wait (s) a new check is refused as "busy" (503)
    // and the app shows its own quick result instead.
    busyEtaSeconds: parseInt(process.env.SPEECH_BUSY_ETA_SECONDS || '15', 10),
  },

  // Voice donation (`docs/plans/Voice donation consent plan.md`, 2026-10-11). Off unless
  // VOICE_DONATION_ENABLED=true (UAT only until the legal text is approved).
  // VOICE_DONATION_KEY = 32 random bytes, base64 (`openssl rand -base64 32`):
  // donated recordings are encrypted with it before they are stored; without
  // it nothing is kept. The bucket is private, on the media store (storage.*).
  voiceDonation: {
    enabled: process.env.VOICE_DONATION_ENABLED === 'true',
    key: process.env.VOICE_DONATION_KEY ?? '',
    bucket: process.env.VOICE_DONATION_BUCKET || 'voice-donations',
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

  // Media storage (word + speaking audio): RustFS on this Mac, public at
  // https://media.dygoacademy.com, since 2026-10-04 (option 2);
  // STORAGE_PROVIDER=r2 switches back to Cloudflare R2. See
  // storage-config.ts. Supabase Storage (docker-compose `supabase-storage`)
  // is separate and unrelated.
  storage: storageConfigFrom(process.env),
});
