import fs from 'node:fs';
import path from 'node:path';

import { chromium, type FullConfig } from '@playwright/test';

import { AUTH_FILE, SIGN_IN_SKIP_REASON, e2eCredentials } from './auth';

/**
 * Signs the fixture user in once per run and saves the session to
 * `.auth/user.json`, which tests/fixtures.ts hands to every test.
 * Without E2E_EMAIL / E2E_PASSWORD it removes any old session and returns,
 * so the signed-in tests skip rather than run as a stale user.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const creds = e2eCredentials();
  if (!creds) {
    fs.rmSync(AUTH_FILE, { force: true });
    console.warn(`[ui global-setup] ${SIGN_IN_SKIP_REASON}`);
    return;
  }

  const use = config.projects[0]?.use ?? {};
  const baseURL = use.baseURL || process.env.BASE_URL || 'http://localhost:3000';
  const url = new URL(baseURL);
  const browser = await chromium.launch({
    channel: use.channel,
    ...(use.launchOptions ?? {}),
  });
  try {
    const context = await browser.newContext({ baseURL });
    await context.addCookies([
      { name: 'dygo_ui', value: 'garden', domain: url.hostname, path: '/' },
    ]);
    const page = await context.newPage();
    await page.goto('/login?next=%2Fgarden');
    await page.getByLabel('Email', { exact: true }).fill(creds.email);
    await page.getByLabel('Password', { exact: true }).fill(creds.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    try {
      await page.waitForURL((u) => u.pathname.startsWith('/garden'), { timeout: 30_000 });
    } catch {
      const message = await page
        .locator('form p.text-destructive')
        .textContent()
        .catch(() => null);
      throw new Error(
        `[ui global-setup] sign-in as ${creds.email} did not reach /garden (still on ${page.url()})` +
          (message ? `: ${message}` : ''),
      );
    }
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    await context.storageState({ path: AUTH_FILE });
  } finally {
    await browser.close();
  }
}
