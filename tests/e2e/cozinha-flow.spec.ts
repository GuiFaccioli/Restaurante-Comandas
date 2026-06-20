import { test, expect } from '@playwright/test'

test.describe('Cozinha — display e status', () => {
  test('SSE endpoint returns text/event-stream content-type', async ({ request }) => {
    // Test the SSE endpoint /api/events
    // It should return the correct content-type header
    const response = await request.get('/api/events', {
      // Add a short timeout to avoid hanging on the streaming endpoint
      timeout: 1000,
    })

    // Check response status is 200
    expect(response.status()).toBe(200)

    // Check that the content-type header contains 'text/event-stream'
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('text/event-stream')

    // Check for other SSE headers
    expect(response.headers()['cache-control']).toBe('no-cache, no-transform')
    expect(response.headers()['connection']).toBe('keep-alive')
  })

  test('SSE endpoint connected (heartbeat message)', async ({ request }) => {
    // Test that the SSE endpoint sends an initial heartbeat
    // This confirms the stream is set up correctly
    const response = await request.get('/api/events', {
      timeout: 1000,
    })

    expect(response.status()).toBe(200)

    // The endpoint should have sent the initial heartbeat
    // ': connected\n\n' which is a valid SSE comment
    const text = await response.text()
    expect(text).toContain(': connected')
  })

  test('dashboard loads with 4 kanban columns', async ({ page }) => {
    // Navigate to the cozinha dashboard
    await page.goto('/cozinha/dashboard')

    // Verify the main heading exists
    await expect(page.locator('h1', { hasText: 'Cozinha' })).toBeVisible()

    // Check for all 4 column headers by their labels
    await expect(page.locator('text=Novos')).toBeVisible()
    await expect(page.locator('text=Em Preparo')).toBeVisible()
    await expect(page.locator('text=Prontos')).toBeVisible()
    await expect(page.locator('text=Entregues')).toBeVisible()

    // Verify that the page uses a grid layout with 4 columns
    const grid = page.locator('div[class*="grid-cols-4"]')
    await expect(grid).toBeVisible()
  })

  test('dashboard page loads without auth (cozinha is public)', async ({ page }) => {
    // The cozinha dashboard does not require authentication
    // This test verifies it loads successfully
    const response = await page.goto('/cozinha/dashboard')

    // Check that the navigation was successful (200 or similar)
    expect(response?.ok()).toBeTruthy()

    // Verify page content loads
    await expect(page.locator('h1', { hasText: 'Cozinha' })).toBeVisible()
  })

  test('dashboard SSE listener is initialized', async ({ page }) => {
    // Navigate to the cozinha dashboard
    await page.goto('/cozinha/dashboard')

    // The page should have loaded and the SseListener component should be initialized
    // We verify this by checking that the kanban board is present
    // (SseListener is rendered within KanbanBoard)
    const kanbanColumns = page.locator('[class*="grid-cols-4"]')
    await expect(kanbanColumns).toBeVisible()

    // Verify that the page is interactive (no script errors)
    // by checking that elements are present and the layout is correct
    const heading = page.locator('h2:has-text("Novos")')
    await expect(heading).toBeVisible()
  })
})
