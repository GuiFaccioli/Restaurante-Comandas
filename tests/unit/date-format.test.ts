import { describe, expect, it } from 'vitest'
import { formatPedidoCriadoEm } from '@/lib/date-format'

describe('date formatting', () => {
  it('formats pedido creation dates deterministically for SSR hydration', () => {
    expect(formatPedidoCriadoEm('2026-06-30T23:29:49.000Z')).toBe('30/06/2026, 20:29:49')
  })
})
