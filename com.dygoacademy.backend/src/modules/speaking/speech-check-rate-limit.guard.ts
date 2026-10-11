import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

import { SPEAKING_CHECKS_PER_HOUR } from './speaking.types';

/**
 * `POST /speaking/check-speech`: at most SPEAKING_CHECKS_PER_HOUR checks per learner
 * in any rolling hour (Phase 13 S17), so one learner (or a stolen token)
 * can't tie up the speech scorer, which runs one check at a time on this Mac.
 *
 * In-process, like SprintRateLimitGuard: fine for the single API process on
 * the UAT Mac; a second API instance would keep its own count, so move this
 * to Redis when the API is scaled out. Runs after the global
 * SupabaseJwtGuard, so `request.user` is set.
 */
@Injectable()
export class SpeechCheckRateLimitGuard implements CanActivate {
  /** Exported so tests can shrink the window instead of waiting an hour. */
  static WINDOW_MS = 60 * 60 * 1000;
  static LIMIT = SPEAKING_CHECKS_PER_HOUR;

  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.id;
    if (!userId) return true; // no user = the JWT guard already refused it

    const now = Date.now();
    const recent = (this.hits.get(userId) ?? []).filter(
      (t) => now - t < SpeechCheckRateLimitGuard.WINDOW_MS,
    );
    if (recent.length >= SpeechCheckRateLimitGuard.LIMIT) {
      const retryAfterSeconds = Math.ceil(
        (SpeechCheckRateLimitGuard.WINDOW_MS - (now - recent[0])) / 1000,
      );
      this.hits.set(userId, recent);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many speaking checks this hour. Try again in ${Math.ceil(retryAfterSeconds / 60)} min.`,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(userId, recent);
    return true;
  }
}
