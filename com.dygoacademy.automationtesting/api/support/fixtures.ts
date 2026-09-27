/**
 * The test dataset. Every id here is copied from
 * `database/seeds/01_core_fixtures.sql`, which is the single source of
 * truth — if a migration changes an id or a seeded value, update it there
 * first and mirror the change here, not the other way around.
 *
 * Cast (see 004's own header comment for the RBAC-coverage reasoning):
 *   Oxford English Center (tenant)
 *     sarah  ADMIN  — owns group 1 (private) and group 2 (public)
 *     marco  WRITE  — co-teacher on group 1
 *     alex   READ   — student on group 1, has real SRS history incl. a leech
 *     priya  READ   — student on group 1, mirrors alex on the same two words
 *   Rival Academy (second tenant — cross-tenant isolation probe)
 *     dana   ADMIN  — owns group 3, must never see Oxford's private data
 */
export const FIXTURES = {
  sarah: { id: '11111111-1111-1111-1111-111111111111', email: 'sarah@dygo.test' },
  marco: { id: '22222222-2222-2222-2222-222222222222', email: 'marco@dygo.test' },
  alex: { id: '33333333-3333-3333-3333-333333333333', email: 'alex@dygo.test' },
  priya: { id: '44444444-4444-4444-4444-444444444444', email: 'priya@dygo.test' },
  dana: { id: '55555555-5555-5555-5555-555555555555', email: 'dana@dygo.test' },
} as const;

export type FixtureName = keyof typeof FIXTURES;

export const TENANTS = {
  oxford: 'aaaaaaaa-0000-0000-0000-000000000001',
  rival: 'aaaaaaaa-0000-0000-0000-000000000002',
} as const;

export const GROUPS = {
  /** Sarah ADMIN, Marco WRITE, Alex+Priya READ. Private. */
  ieltsClass: 'bbbbbbbb-0000-0000-0000-000000000001',
  /** Sarah ADMIN only. Public. */
  publicAwl: 'bbbbbbbb-0000-0000-0000-000000000002',
  /** Dana ADMIN, Rival tenant. Must be invisible to every Oxford fixture. */
  rivalPrivate: 'bbbbbbbb-0000-0000-0000-000000000003',
} as const;

export const TOPICS = {
  /** group=ieltsClass, private. Has 'ephemeral' (READY), 'resilient' (READY), 'ubiquitous' (FAILED). */
  unit1AbstractNouns: 'cccccccc-0000-0000-0000-000000000001',
  /** group=publicAwl, public. Has 'analyse' (READY). Cloneable by any WRITE caller. */
  awlSublist1: 'cccccccc-0000-0000-0000-000000000002',
  /** group=rivalPrivate. Must be invisible/404 to every Oxford fixture. */
  rivalPrivateTopic: 'cccccccc-0000-0000-0000-000000000003',
} as const;

export const WORDS = {
  /** topic=unit1AbstractNouns, READY. Alex: doing well, next_due_at +5d (not due now). */
  ephemeral: 'eeeeeeee-0000-0000-0000-000000000001',
  /** topic=unit1AbstractNouns, READY. Alex: is_leech=true, next_due_at -1h (due now). */
  resilient: 'eeeeeeee-0000-0000-0000-000000000002',
  /** topic=unit1AbstractNouns, FAILED — 'Gemini quota exceeded after 3 retries'. Added by marco. Good re-enrich target. */
  ubiquitousFailed: 'eeeeeeee-0000-0000-0000-000000000003',
  /** topic=awlSublist1, READY, no audio/synonyms/antonyms (empty arrays). */
  analyse: 'eeeeeeee-0000-0000-0000-000000000004',
  /** topic=rivalPrivateTopic, ENRICHING. Must be invisible to every Oxford fixture. */
  clandestine: 'eeeeeeee-0000-0000-0000-000000000005',
} as const;
