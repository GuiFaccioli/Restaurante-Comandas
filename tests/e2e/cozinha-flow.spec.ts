import { test, expect } from '@playwright/test'

test.describe('Cozinha — acesso autenticado e polling', () => {
  test('kitchen polling endpoint rejects an unauthenticated request', async ({ request }) => {
    const response = await request.get('/api/cozinha/pedidos', { maxRedirects: 0 })

    expect(response.status()).toBe(307)
    expect(response.headers().location).toContain('/auth/sign-in')
  })

  test('kitchen dashboard redirects unauthenticated visitors to sign in', async ({ page }) => {
    await page.goto('/cozinha/dashboard')

    await expect(page).toHaveURL(/\/auth\/sign-in/)
  })
})
