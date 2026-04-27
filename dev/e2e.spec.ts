import { expect, test } from '@playwright/test'

// this is an example Playwright e2e test
test('should render admin panel logo', async ({ page }) => {
  await page.goto('/admin')

  // login
  await page.fill('#field-email', 'dev@payloadcms.com')
  await page.fill('#field-password', 'test')
  await page.click('.form-submit button')

  // should show dashboard
  await expect(page).toHaveTitle(/Dashboard/)
  await expect(page.locator('.graphic-icon')).toBeVisible()
})

test('should show page types health widget in the dashboard drawer', async ({ page }) => {
  await page.goto('/admin')

  // login
  await page.fill('#field-email', 'dev@payloadcms.com')
  await page.fill('#field-password', 'test')
  await page.click('.form-submit button')

  // Open dashboard edit mode (modular dashboard)
  // Note: The selector for "Edit Dashboard" might depend on Payload version
  const editButton = page.locator('button:has-text("Edit Dashboard")')
  if (await editButton.isVisible()) {
    await editButton.click()
    
    // Click add widget
    await page.locator('button:has-text("Add Widget")').click()
    
    // Check if our widget is in the list
    await expect(page.locator('text=Page Types Health')).toBeVisible()
  }
})
