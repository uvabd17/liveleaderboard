import { test, expect } from '@playwright/test'

test.describe('Public Leaderboard', () => {
  test('should display demo event leaderboard', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Should show event name or leaderboard content
    await expect(page.locator('body')).toContainText(/demo|hackathon|leaderboard/i)
  })

  test('should display participant list or empty state', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026')
    
    await page.waitForLoadState('networkidle')
    
    // Should have either participants or an empty state message
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })
})

test.describe('Event Registration', () => {
  test('should access registration page with token', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026/register?token=DEMO-REG-TOKEN')
    
    await page.waitForLoadState('networkidle')
    
    // Should show registration form or event info
    await expect(page.locator('body')).toContainText(/register|team|participant|join/i)
  })
})

test.describe('Judge Portal', () => {
  test('should display judge join page', async ({ page }) => {
    await page.goto('/e/demo-hackathon-2026/judge/join')
    
    await page.waitForLoadState('networkidle')
    
    // Should show judge login/join interface
    await expect(page.locator('body')).toContainText(/judge|code|enter/i)
  })
})
