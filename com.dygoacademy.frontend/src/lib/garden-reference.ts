/**
 * Whether the canvas reference pages (/garden/_reference/<name>, the
 * `garden:diff` fixtures) may be served.
 *
 * Always in development. In a production build only when it was built
 * with GARDEN_REFERENCE_PAGES=on (e.g. in env-profiles/prod.env), so the
 * pixel diff can run against UAT (`--base https://www.dygoacademy.com`).
 * next.config.mjs inlines the value at build time, because pm2's
 * `next start` doesn't load the env profile. Off unless set: the pages
 * show fixture data only, and are noindex, but they are public while on.
 */
export function referencePagesAllowed(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  flag: string | undefined = process.env.GARDEN_REFERENCE_PAGES,
): boolean {
  return nodeEnv !== 'production' || flag === 'on';
}
