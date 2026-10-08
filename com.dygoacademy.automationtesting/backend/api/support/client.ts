/**
 * Thin supertest wrapper bound to a running backend (not an in-process Nest
 * app) — these tests exercise the real HTTP server, real Postgres RLS, and
 * real guards, which is the whole point: unit tests already cover the
 * service layer against mocks.
 */
import supertest from 'supertest';

import { FixtureName } from './fixtures';
import { mintToken } from './token';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const request = supertest(BASE_URL);

/** `.set(authHeader('sarah'))` on any supertest call. */
export function authHeader(name: FixtureName): { Authorization: string } {
  return { Authorization: `Bearer ${mintToken(name)}` };
}

/** Envelope every response body is wrapped in — see TransformResponseInterceptor. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { timestamp: string };
}
