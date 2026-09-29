import { expect, referenceScreens, settleGarden, test } from './fixtures';

/**
 * Every canvas reference page (/garden/_reference/<name>), en-US and vi-VN
 * where the canvas has a Vietnamese version, at every viewport. These pages
 * are dev-only fixtures and need no sign-in.
 */
const screens = referenceScreens();

test('reference screens are found', () => {
  expect(
    screens.length,
    'No reference PNGs in docs/design/garden/reference (or REFERENCE_DIR)',
  ).toBeGreaterThan(0);
});

for (const { name, locales } of screens) {
  for (const locale of locales) {
    test(`reference ${name} (${locale})`, async ({ page }) => {
      const response = await page.goto(`/garden/_reference/${name}?locale=${locale}`, {
        waitUntil: 'load',
      });
      expect(response?.status(), `HTTP status of /garden/_reference/${name}`).toBe(200);
      await settleGarden(page);
      await expect(page).toHaveScreenshot(`reference-${name}-${locale}.png`, { fullPage: true });
    });
  }
}
