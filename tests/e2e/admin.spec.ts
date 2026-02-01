import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', 'admin@demo.com')
    await page.fill('input[type="password"]', 'demo123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard', { timeout: 10000 })
  })

  test('should display dashboard after login', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/dashboard|events|create/i)
  })

  test('should navigate to event admin', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026/admin')
    
    await page.waitForLoadState('networkidle')
    
    // Should show admin interface
    await expect(page.locator('body')).toContainText(/admin|participants|judges|settings/i)
  })

  test('should access event settings', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026/admin/settings')
    
    await page.waitForLoadState('networkidle')
    
    // Should show settings page
    await expect(page.locator('body')).toContainText(/settings|configuration|features/i)
  })

  test('should access rounds management', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026/admin/rounds')
    
    await page.waitForLoadState('networkidle')
    
    // Should show rounds interface
    await expect(page.locator('body')).toContainText(/round|judging|timer/i)
  })

  test('should access rubric/scoring criteria', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026/admin/rubric')
    
    await page.waitForLoadState('networkidle')
    
    // Should show rubric/criteria interface
    await expect(page.locator('body')).toContainText(/rubric|criteria|scoring/i)
  })

  test('should access analytics page', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026/admin/analytics')
    
    await page.waitForLoadState('networkidle')
    
    // Should show analytics interface
    await expect(page.locator('body')).toContainText(/analytics|statistics|overview/i)
  })
})
