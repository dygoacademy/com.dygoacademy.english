import { expect, test } from './fixtures';

/**
 * Home page v2 (Phase 12, HP-11): the public home page at "/", signed out,
 * at every QA viewport. Strings are en-US (`screens.home.public.*`).
 * Some blocks render once per layout, so locators keep only visible ones.
 */
test.use({ gardenLocale: 'en-US', storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  expect(new URL(page.url()).pathname, 'signed-out "/" should stay on the home page').toBe('/');
});

test('planting a chip word shows the word card', async ({ page }) => {
  const chips = page.getByRole('group', { name: 'Try a word' }).filter({ visible: true }).first();
  await chips.getByRole('button', { name: 'deadline' }).click();
  await expect(page.getByTestId('plant-card').filter({ visible: true }).first()).toBeVisible();
});

test('a pain card flips to how Dygo helps', async ({ page }) => {
  // The accessible name changes with the side shown, so match the front or the back.
  const card = page
    .getByRole('button', { name: /forget it by next week|brings each word back right before/ })
    .filter({ visible: true })
    .first();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(card).toContainText('Dygo brings each word back right before you’d forget it.');
});

test('the Travel bed can be selected and is coming soon', async ({ page }) => {
  const tab = page.getByRole('tab', { name: /Travel/ }).filter({ visible: true }).first();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel').filter({ visible: true }).first()).toContainText('Coming soon');
});

test('an FAQ item opens', async ({ page }) => {
  const summary = page.locator('summary', { hasText: 'Does it work on my phone?' }).first();
  await summary.scrollIntoViewIfNeeded();
  await summary.click();
  await expect(summary.locator('xpath=..')).toHaveAttribute('open', '');
});

test('the seed packet call to action goes to /register', async ({ page }) => {
  const cta = page.getByRole('link', { name: 'Create free account' }).filter({ visible: true }).last();
  await expect(cta).toHaveAttribute('href', /^\/register(\?|$)/);
});
