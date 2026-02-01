import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display sign in page', async ({ page }) => {
    await page.goto('/auth/signin')
    
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByPlaceholder('name@company.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin')
    
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })

  test('should navigate to sign up page', async ({ page }) => {
    await page.goto('/auth/signin')
    
    await page.click('text=Create an account')
    
    await expect(page).toHaveURL('/auth/signup')
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
  })

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/auth/signin')
    
    await page.click('text=Forgot password?')
    
    await expect(page).toHaveURL('/auth/forgot-password')
    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible()
  })

  test('should display sign up page with all fields', async ({ page }) => {
    await page.goto('/auth/signup')
    
    await expect(page.getByPlaceholder('name@company.com')).toBeVisible()
    await expect(page.getByPlaceholder('John Doe')).toBeVisible()
    await expect(page.getByPlaceholder('Acme Inc.')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should sign in with demo credentials', async ({ page }) => {
    await page.goto('/auth/signin')
    
    await page.fill('input[type="email"]', 'admin@demo.com')
    await page.fill('input[type="password"]', 'demo123456')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  })
})
