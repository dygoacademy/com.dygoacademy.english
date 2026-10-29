import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { NodeRequest } from '@nestjs/platform-node';

/**
 * FR-6.2's `POST /notifications/groups/:groupId/sprint` had no rate limit at
 * all — flagged as a known gap since the fifth pass and carried forward
 * unfixed through the tenth (see the master schedule's Phase 3 status note
 * and the tenth pass's session report entry). Left open that long because
 * pulling in `@nestjs/throttler` (a new dependency, network install, its own
 * config surface) the night before UAT was judged riskier than the gap
 * itself — a teacher spamming their own class is a nuisance, not a security
 * hole.
 *
 * This is the smallest fix that actually closes the gap: a single
 * in-process cooldown per group, no new dependency, same `CanActivate`
 * shape as `SupabaseJwtGuard`. Deliberately **not** what a production
 * multi-instance deployment would want — the `Map` is per-process memory,
 * so a horizontally-scaled API would let each instance grant its own
 * cooldown independently. That's an explicit, documented tradeoff: closing
 * "no limit at all" now is worth more than leaving it open until a proper
 * Redis-backed limiter (Module 7's Stripe work already means a Redis
 * client is coming into this codebase; sharing it for this is the natural
 * follow-up, not a new gap).
 */
@Injectable()
export class SprintRateLimitGuard implements CanActivate {
  /** Exported so tests can shrink it instead of sleeping for real. */
  static COOLDOWN_MS = 60_000;

  private readonly lastTriggeredAt = new Map<string, number>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<NodeRequest>();
    const rawGroupId: unknown = request.params?.groupId;
    const groupId = typeof rawGroupId === 'string' ? rawGroupId : undefined;
    if (!groupId) {
      // No groupId on the route at all is a routing bug, not a rate-limit
      // concern — let the controller/param validation surface that instead
      // of masking it behind a 429.
      return true;
    }

    const now = Date.now();
    const last = this.lastTriggeredAt.get(groupId);
    if (last !== undefined) {
      const elapsed = now - last;
      if (elapsed < SprintRateLimitGuard.COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((SprintRateLimitGuard.COOLDOWN_MS - elapsed) / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `This group was just sent a class sprint. Try again in ${retryAfterSeconds}s.`,
            retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    this.lastTriggeredAt.set(groupId, now);
    return true;
  }
}
