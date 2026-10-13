// @vitest-environment node
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import manifest from './manifest';

describe('web app manifest (PWA)', () => {
  const m = manifest();

  it('installs as a standalone app that opens on the garden home', () => {
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/garden');
    expect(m.scope).toBe('/');
    expect(m.name).toBe('Dygo Academy');
    expect(m.short_name).toBe('Dygo');
  });

  it('lists 192 and 512 icons plus a maskable one, and every icon file exists in public/', () => {
    const icons = m.icons ?? [];
    expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of icons) {
      expect(existsSync(path.resolve(__dirname, '../../public', icon.src.slice(1)))).toBe(true);
    }
  });

  it('ships the offline page the service worker caches', () => {
    expect(existsSync(path.resolve(__dirname, '../../public/offline.html'))).toBe(true);
  });
});
