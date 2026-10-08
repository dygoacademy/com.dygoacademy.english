import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(buildId = 'build-a') {
  vi.stubEnv('NEXT_PUBLIC_BUILD_ID', buildId);
  vi.resetModules();
  return import('./app-version');
}

const reply = (body: object) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch;

describe('app version (PWA updates)', () => {
  it('stays current when the server runs the same build', async () => {
    const v = await load();
    expect(await v.checkForNewBuild(reply({ build_id: 'build-a' }))).toBe('current');
  });

  it('a different deployed build means a new version is available', async () => {
    const v = await load();
    const listener = vi.fn();
    v.subscribeUpdateStatus(listener);
    expect(await v.checkForNewBuild(reply({ build_id: 'build-b' }))).toBe('available');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('offline: a failed check changes nothing', async () => {
    const v = await load();
    const failing = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    expect(await v.checkForNewBuild(failing)).toBe('current');
  });

  it('never checks in development builds', async () => {
    const v = await load('');
    const fetcher = reply({ build_id: 'x' });
    await v.checkForNewBuild(fetcher);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('recognises chunk load errors from old JavaScript', async () => {
    const v = await load();
    const chunk = new Error('Loading chunk 1234 failed.');
    chunk.name = 'ChunkLoadError';
    expect(v.isChunkLoadError(chunk)).toBe(true);
    expect(v.isChunkLoadError('Failed to fetch dynamically imported module: /x.js')).toBe(true);
    expect(v.isChunkLoadError(new Error('Network error'))).toBe(false);
  });
});
