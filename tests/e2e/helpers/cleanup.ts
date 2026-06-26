import { type Page } from '@playwright/test';

export async function cleanupSmokeWorkspaces(page: Page): Promise<void> {
  console.log('🧹 Starting cleanup of Smoke_* workspaces...');
  // Click Explorer activity bar icon
  const explorerBtn = page.locator('aside.w-14').getByRole('button', { name: 'Explorer', exact: true });
  if (await explorerBtn.isVisible().catch(() => false)) {
    await explorerBtn.click();
    await page.waitForTimeout(500);
  }

  const projectSidebar = page.locator('aside:not(.w-14)');

  // Loop to find and delete workspace folders starting with "Smoke_"
  let found = true;
  let attempts = 0;
  const maxAttempts = 15; // safety check to prevent infinite loop

  while (found && attempts < maxAttempts) {
    attempts++;
    const smokeWorkspaceRow = projectSidebar
      .locator('div')
      .filter({ hasText: /^Smoke_/i })
      .filter({ has: page.locator('button[title="Delete Workspace"]') })
      .first();

    if (await smokeWorkspaceRow.isVisible().catch(() => false)) {
      const workspaceName = await smokeWorkspaceRow.locator('span').first().textContent().catch(() => 'Unknown');
      console.log(`Deleting workspace: ${workspaceName}`);
      
      await smokeWorkspaceRow.hover().catch(() => {});
      const deleteBtn = smokeWorkspaceRow.locator('button[title="Delete Workspace"]').first();
      await deleteBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      
      // Click confirm delete in modal
      const confirmBtn = page.locator('div').filter({ hasText: 'Delete Workspace' }).getByRole('button', { name: 'Delete', exact: true });
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click().catch(() => {});
        await page.waitForTimeout(1500); // Wait for deletion to complete and DOM to update
      } else {
        // Fallback: click any button with text "Delete" in the modal
        const fallbackConfirmBtn = page.getByRole('button', { name: 'Delete', exact: true });
        if (await fallbackConfirmBtn.isVisible().catch(() => false)) {
          await fallbackConfirmBtn.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
    } else {
      found = false;
    }
  }
  console.log('🧹 Finished cleanup of Smoke_* workspaces.');
}
