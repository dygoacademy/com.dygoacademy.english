import fs from 'node:fs';
import path from 'node:path';

/**
 * Signed-in fixture user (Phase 12, UI-3 U3-4).
 *
 * Credentials come from `ui/.env.e2e` (gitignored) or the environment:
 *   E2E_EMAIL=someone@example.com
 *   E2E_PASSWORD=...
 * The real environment wins over the file. When either is missing, the
 * signed-in tests skip with SIGN_IN_SKIP_REASON instead of failing.
 */
export const ENV_FILE = path.resolve(__dirname, '.env.e2e');

/** Where global-setup.ts saves the signed-in session (gitignored `.auth/`). */
export const AUTH_FILE = path.resolve(__dirname, '.auth/user.json');

export const SIGN_IN_SKIP_REASON =
  'No signed-in fixture user: set E2E_EMAIL and E2E_PASSWORD in com.dygoacademy.automationtesting/ui/.env.e2e (see README.md)';

/** Minimal KEY=value reader for `.env.e2e` (no dotenv dependency). */
function readEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function e2eCredentials(): { email: string; password: string } | null {
  const file = readEnvFile(ENV_FILE);
  const email = process.env.E2E_EMAIL || file.E2E_EMAIL || '';
  const password = process.env.E2E_PASSWORD || file.E2E_PASSWORD || '';
  return email && password ? { email, password } : null;
}

/** True when global setup saved a session for this run. */
export function hasSignedInSession(): boolean {
  return e2eCredentials() !== null && fs.existsSync(AUTH_FILE);
}
