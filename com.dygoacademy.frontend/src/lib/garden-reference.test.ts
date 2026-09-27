import { describe, expect, it } from 'vitest';

import { referencePagesAllowed } from './garden-reference';

describe('referencePagesAllowed', () => {
  it('always allows them outside production', () => {
    expect(referencePagesAllowed('development', undefined)).toBe(true);
    expect(referencePagesAllowed('test', '')).toBe(true);
  });

  it('blocks them in production unless GARDEN_REFERENCE_PAGES=on', () => {
    expect(referencePagesAllowed('production', undefined)).toBe(false);
    expect(referencePagesAllowed('production', '')).toBe(false);
    expect(referencePagesAllowed('production', 'true')).toBe(false);
    expect(referencePagesAllowed('production', 'on')).toBe(true);
  });
});
