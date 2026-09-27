import { SCREENSHOT_LOCALES, expect, settleGarden, test } from './fixtures';

/**
 * The component gallery (/garden/_gallery) in en-SG and vi-VN at every
 * viewport. The gallery sits inside the signed-in (garden) layout, so
 * without a session it redirects to the login page; until U3-4 adds the
 * signed-in fixture user these tests skip in that case instead of failing.
 */
for (const locale of SCREENSHOT_LOCALES) {
  test.describe(`gallery (${locale})`, () => {
    test.use({ gardenLocale: locale });

    test(`gallery ${locale}`, async ({ page }) => {
      const response = await page.goto('/garden/_gallery', { waitUntil: 'load' });
      const path = new URL(page.url()).pathname;
      test.skip(
        !path.startsWith('/garden'),
        `/garden/_gallery needs a signed-in user (redirected to ${path}); U3-4 adds one`,
      );
      expect(response?.status(), 'HTTP status of /garden/_gallery').toBe(200);
      await settleGarden(page);
      await expect(page).toHaveScreenshot(`gallery-${locale}.png`, { fullPage: true });
    });
  });
}
