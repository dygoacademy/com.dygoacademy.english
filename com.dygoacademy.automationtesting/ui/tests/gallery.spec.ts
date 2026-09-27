import {
  SCREENSHOT_LOCALES,
  SIGN_IN_SKIP_REASON,
  expect,
  hasSignedInSession,
  settleGarden,
  test,
} from './fixtures';

/**
 * The component gallery (/garden/_gallery) in en-SG and vi-VN at every
 * viewport. The gallery sits inside the signed-in (garden) layout, so it
 * needs the fixture user (U3-4, `.env.e2e`); without one these tests skip.
 */
for (const locale of SCREENSHOT_LOCALES) {
  test.describe(`gallery (${locale})`, () => {
    test.use({ gardenLocale: locale });

    test(`gallery ${locale}`, async ({ page }) => {
      test.skip(!hasSignedInSession(), SIGN_IN_SKIP_REASON);
      const response = await page.goto('/garden/_gallery', { waitUntil: 'load' });
      const path = new URL(page.url()).pathname;
      expect(path, 'signed-in session was not accepted (redirected)').toMatch(/^\/garden/);
      expect(response?.status(), 'HTTP status of /garden/_gallery').toBe(200);
      await settleGarden(page);
      await expect(page).toHaveScreenshot(`gallery-${locale}.png`, { fullPage: true });
    });
  });
}
