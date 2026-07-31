import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  getKitchenOrders: vi.fn(),
}))

vi.mock('@/lib/auth/access', () => ({ requireAccess: mocks.requireAccess }))
vi.mock('@/lib/kitchen/queries', () => ({ getKitchenOrders: mocks.getKitchenOrders }))

import { GET } from '@/app/api/cozinha/pedidos/route'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/cozinha/pedidos', () => {
  it('rejects requests without kitchen access', async () => {
    mocks.requireAccess.mockRejectedValueOnce(new Error('Unauthorized'))

    await expect(GET()).rejects.toThrow('Unauthorized')
    expect(mocks.getKitchenOrders).not.toHaveBeenCalled()
  })

  it('uses the authenticated tenant and disables caching', async () => {
    mocks.requireAccess.mockResolvedValueOnce({ tenantId: 'trusted-tenant' })
    mocks.getKitchenOrders.mockResolvedValueOnce([])

    const response = await GET()

    expect(mocks.requireAccess).toHaveBeenCalledWith('cozinha')
    expect(mocks.getKitchenOrders).toHaveBeenCalledWith({ tenantId: 'trusted-tenant' })
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
})
