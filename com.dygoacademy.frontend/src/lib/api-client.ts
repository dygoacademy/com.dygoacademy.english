/**
 * Typed fetch wrapper for the NestJS API. Unwraps the ApiResponse<T>
 * envelope (src/types/api.ts, mirroring the backend's
 * common/interfaces/api-response.interface.ts) once, here, instead of at
 * every call site.
 */
import { env } from '@/config/env';
import { createClient } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      // A FormData body sets its own multipart Content-Type (with the boundary).
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init.headers,
    },
  });

  // 204 No Content (every `@HttpCode(HttpStatus.NO_CONTENT)` DELETE route —
  // see GroupsController's removeMember/revokeInvite, and Module 6's
  // unsubscribe/deleteSchedule) has no body at all: Express strips it from
  // the response regardless of what TransformResponseInterceptor produced,
  // so `res.json()` always fails to parse here. That failure means
  // "succeeded with nothing to unwrap," not an error — only fall through to
  // the ApiError path when the status itself says something went wrong.
  if (res.status === 204) {
    if (!res.ok) throw new ApiError(res.statusText, res.status);
    return undefined as T;
  }

  const body = (await res.json().catch(() => undefined)) as ApiResponse<T> | undefined;

  if (!res.ok || !body?.success) {
    throw new ApiError(body?.message?.toString() ?? res.statusText, res.status, body);
  }

  return body.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, json?: unknown) =>
    request<T>(path, { method: 'POST', body: json ? JSON.stringify(json) : undefined }),
  patch: <T>(path: string, json?: unknown) =>
    request<T>(path, { method: 'PATCH', body: json ? JSON.stringify(json) : undefined }),
  /** Multipart POST (e.g. a recording for `/speaking/check-speech`). */
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
  delete: <T>(path: string, json?: unknown) =>
    request<T>(path, { method: 'DELETE', body: json ? JSON.stringify(json) : undefined }),
};
