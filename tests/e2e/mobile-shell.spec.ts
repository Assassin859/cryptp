import { test, expect } from '@playwright/test';

const SMOKE_EMAIL = process.env.SMOKE_EMAIL;
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD;
if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
  throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD must be set (see .env.example)');
}

// ─── Shared login helper ────────────────────────────────────────────────────
async function loginAndWait(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('cryptp-session-init', 'true');
  });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const loginBtn = page.getByRole('button', { name: 'Sign In To Console' });
  if (await loginBtn.isVisible().catch(() => false)) {
    await page.getByPlaceholder('name@company.com').fill(SMOKE_EMAIL);
    await page.getByPlaceholder('••••••••').fill(SMOKE_PASSWORD);
    await loginBtn.click();
    // Wait for auth redirect and initial render to settle
    await page.waitForLoadState('networkidle');
  }

  // Dismiss "Connect Accounts" modal if present
  const linkModal = page.getByText('Connect Accounts');
  if (await linkModal.isVisible().catch(() => false)) {
    await page.locator('.fixed.inset-0').filter({ hasText: 'Connect Accounts' }).getByRole('button').first().click();
    await page.waitForTimeout(500);
  }

  // Wait for IDE to be ready (project name or loading state to resolve)
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading...'),
    { timeout: 30_000 }
  ).catch(() => {/* ignore if already loaded */});
}

// ─── Suite 1: Mobile shell DOM hardening ────────────────────────────────────
test.describe('CryptP Mobile-Safe Shell DOM test', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('no horizontal scroll and mobile styles are active', async ({ page }) => {
    await loginAndWait(page);

    // 1. Verify page does not have horizontal scroll overflows
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    // 2. Verify vertical activity bar is hidden on mobile
    const activityBar = page.locator('aside.w-14');
    if (await activityBar.count() > 0) {
      await expect(activityBar).toBeHidden();
    }

    // 3. Verify workspace folders / breadcrumb subbar is hidden on mobile
    const editorBreadcrumbs = page.locator('.h-9.bg-\\[\\#252526\\]');
    if (await editorBreadcrumbs.count() > 0) {
      await expect(editorBreadcrumbs).toBeHidden();
    }

    // 4. Verify resize handles are hidden on mobile
    const resizeHandles = page.locator('.cursor-col-resize, .cursor-row-resize');
    const handlesCount = await resizeHandles.count();
    for (let i = 0; i < handlesCount; i++) {
      await expect(resizeHandles.nth(i)).toBeHidden();
    }

    // 5. Verify right sidebar is hidden on mobile (max-md:hidden)
    const rightSidebar = page.locator('aside.max-md\\:hidden').last();
    if (await rightSidebar.count() > 0) {
      await expect(rightSidebar).toBeHidden();
    }

    // 6. Verify desktop notice banner is visible
    const desktopNotice = page.getByText(/CryptP is built for desktop/i);
    await expect(desktopNotice).toBeVisible();

    console.log('✅ Mobile Shell DOM test successfully passed!');
  });
});

// ─── Suite 2: Bootstrap regression (returning users) ────────────────────────
test.describe('CryptP Bootstrap regression', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('reload does not duplicate simulations or trigger re-deploy', async ({ page }) => {
    await loginAndWait(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000); // let any bootstrap settle

    // Open History panel (activity bar index 3 = chain)
    const historyTab = page.locator('aside.w-14').getByRole('button', { name: 'History', exact: true });
    await historyTab.click({ timeout: 10_000 });
    await page.waitForTimeout(1000);

    const countBefore = await page.getByTestId('simulation-row').count();
    expect(countBefore, 'History panel should list at least one simulation for returning user').toBeGreaterThan(0);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Dismiss modal again if it re-appears
    const linkModal = page.getByText('Connect Accounts');
    if (await linkModal.isVisible().catch(() => false)) {
      await page.locator('.fixed.inset-0').filter({ hasText: 'Connect Accounts' }).getByRole('button').first().click();
      await page.waitForTimeout(500);
    }

    // Re-open History panel sidebar
    if (await historyTab.isVisible()) {
      await historyTab.click();
      await page.waitForTimeout(500);
    }

    const countAfter = await page.getByTestId('simulation-row').count();

    // Returning users: count must not increase on refresh
    expect(countAfter).toBeLessThanOrEqual(countBefore);

    console.log(`✅ Bootstrap regression: before=${countBefore}, after=${countAfter} — no duplicate simulations.`);
  });
});
