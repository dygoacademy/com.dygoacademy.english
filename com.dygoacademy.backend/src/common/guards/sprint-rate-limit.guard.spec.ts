import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

import { SprintRateLimitGuard } from './sprint-rate-limit.guard';

/**
 * Closes the "FR-6.2 sprint route has no rate limiting" gap flagged since
 * the fifth pass and carried forward unfixed through the tenth (see the
 * eleventh pass's session report entry). One in-process cooldown per
 * groupId, no new dependency — see the guard's own header comment for why
 * that scope was chosen the night before UAT.
 */
describe('SprintRateLimitGuard', () => {
  let guard: SprintRateLimitGuard;
  let now: number;

  function contextFor(groupId: string | undefined): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ params: { groupId } }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    guard = new SprintRateLimitGuard();
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows the first sprint for a group', () => {
    expect(guard.canActivate(contextFor('group-1'))).toBe(true);
  });

  it('blocks a second immediate sprint for the same group with a 429', () => {
    guard.canActivate(contextFor('group-1'));

    expect(() => guard.canActivate(contextFor('group-1'))).toThrow(HttpException);
    try {
      guard.canActivate(contextFor('group-1'));
      fail('expected HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('does not block a different group while one is on cooldown', () => {
    guard.canActivate(contextFor('group-1'));
    expect(guard.canActivate(contextFor('group-2'))).toBe(true);
  });

  it('allows a new sprint once the cooldown window has fully elapsed', () => {
    guard.canActivate(contextFor('group-1'));
    now += SprintRateLimitGuard.COOLDOWN_MS;
    expect(guard.canActivate(contextFor('group-1'))).toBe(true);
  });

  it('still blocks 1ms before the cooldown window elapses', () => {
    guard.canActivate(contextFor('group-1'));
    now += SprintRateLimitGuard.COOLDOWN_MS - 1;
    expect(() => guard.canActivate(contextFor('group-1'))).toThrow(HttpException);
  });

  it('does not rate-limit when the route has no groupId (fails open, not masking a routing bug)', () => {
    expect(guard.canActivate(contextFor(undefined))).toBe(true);
    expect(guard.canActivate(contextFor(undefined))).toBe(true);
  });
});
