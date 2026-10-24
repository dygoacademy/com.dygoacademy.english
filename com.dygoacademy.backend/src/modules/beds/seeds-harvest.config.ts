/**
 * Seeds & Harvest: every tunable number in one place (plan section 1;
 * Phase 4 changes them here only). The feature flag is `SEED_DROPS_ENABLED`
 * (config/configuration.ts `seedDrops.enabled`, off by default).
 */
export const SEEDS_HARVEST = {
  /** Seeds one fruit word drops, at most. */
  seedsPerFruit: 2,
  /** Relation kinds in the order seeds are picked; by `rank` inside each. */
  relationOrder: ['pairing', 'family', 'synonym'] as const,
  /**
   * New words a day by daily goal (missions.plan.ts GOAL_TIERS): Light =
   * the 5-minute goal, Steady = 10, Intense = 15.
   */
  newWordsPerDay: { light: 3, steady: 5, intense: 8 },
  /** More than this many words due at the day's first read… */
  thirstyLimit: 20,
  /** …and the day plants at most this many. */
  thirstyPlant: 2,
  /** S3's packets, in order. */
  packetKinds: ['bee', 'goal', 'new'] as const,
} as const;

export type RelationKind = (typeof SEEDS_HARVEST.relationOrder)[number];

/** SQL `case` giving a relation kind its pick order (0 first). */
export const RELATION_ORDER_SQL = (column: string) =>
  `case ${SEEDS_HARVEST.relationOrder.map((k, i) => `when ${column} = '${k}' then ${i}`).join(' ')} else ${SEEDS_HARVEST.relationOrder.length} end`;
