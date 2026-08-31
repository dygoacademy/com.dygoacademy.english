/**
 * Wire-level envelope shared by every NestJS endpoint — mirrors
 * com.dygoacademy.backend/src/common/interfaces/api-response.interface.ts
 * (tech spec §3.4) field for field. Keep these two in sync by hand; there
 * is no codegen step yet.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}
