import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../interfaces/api-response.interface';

/** Wraps every successful response in the standard envelope (tech spec §3.4). */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      })),
    );
  }
}
