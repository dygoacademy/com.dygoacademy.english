import { plainToInstance } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

/**
 * Fail fast at boot rather than at the first request. A missing or short
 * SUPABASE_JWT_SECRET would otherwise surface as blanket 401s that look like a
 * client bug.
 */
class EnvironmentVariables {
  @IsString()
  @MinLength(32, {
    message: 'SUPABASE_JWT_SECRET must be at least 32 characters — it signs every access token.',
  })
  SUPABASE_JWT_SECRET!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsOptional() @IsString() REDIS_HOST?: string;
  @IsOptional() @IsInt() PORT?: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const parsed = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors.map((e) => Object.values(e.constraints ?? {}).join('; ')).join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${detail}`);
  }
  return config;
}
