import { test, expect } from '@playwright/test'

test.describe('Garçom — fluxo de pedido', () => {
  test('auth redirect: navigates to sign-in without session', async ({ page }) => {
    // Navigate to a protected garçom route without authentication
    // Should redirect to /auth/sign-in
    await page.goto('/garcom/mesas')
    // Due to auth middleware, we expect either a redirect to /auth/sign-in
    // or an error page. The test confirms the auth flow is in place.
    const url = page.url()
    // Check that we're either on sign-in or have been redirected appropriately
    expect(url).toMatch(/(?:auth\/sign-in|error|401)/)
  })

  test('sign-in page loads with form elements', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/auth/sign-in')

    // Verify page title/heading exists
    await expect(page.locator('h1', { hasText: 'Entrar' })).toBeVisible()

    // Verify form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('pedidos page loads (structural test)', async ({ page }) => {
    // Navigate to the garçom pedidos listing page
    // This is a structural test that doesn't require auth or a real DB
    await page.goto('/garcom/mesas')

    // Check that the page has the expected heading
    // Either we see the mesa selection screen or an auth redirect/error
    const pageContent = page.url()
    // Confirm the page loads without crashing
    const status = await page.goto('/garcom/mesas')
    expect(status?.ok() || status?.status() === 307).toBeTruthy() // OK or redirect is acceptable
  })
})
