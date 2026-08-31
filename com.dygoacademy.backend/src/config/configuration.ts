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
});
