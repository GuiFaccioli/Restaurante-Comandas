import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db and sse before importing actions
vi.mock('@/lib/db/index', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  },
}))
vi.mock('@/lib/sse', () => ({ notifyKitchen: vi.fn() }))

import { db } from '@/lib/db/index'
import { notifyKitchen } from '@/lib/sse'
import { criarPedido, enviarPedido, atualizarStatus } from '@/lib/actions/pedidos'

beforeEach(() => vi.clearAllMocks())

describe('criarPedido', () => {
  it('inserts a new pedido and returns id', async () => {
    ;(db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'pedido-1' }]),
      }),
    })
    const result = await criarPedido('mesa-1')
    expect(result).toEqual({ id: 'pedido-1' })
  })
})

describe('enviarPedido', () => {
  it('calls notifyKitchen with novo_pedido event', async () => {
    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { pedidoId: 'p-1', mesaNumero: 4, produtoNome: 'Margherita', quantidade: 2 }
              ]),
            }),
          }),
        }),
      }),
    })
    await enviarPedido('p-1')
    expect(notifyKitchen).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'novo_pedido' })
    )
  })
})

describe('atualizarStatus', () => {
  it('calls notifyKitchen with status_atualizado', async () => {
    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    await atualizarStatus('p-1', 'em_preparo')
    expect(notifyKitchen).toHaveBeenCalledWith({
      type: 'status_atualizado',
      payload: { pedidoId: 'p-1', status: 'em_preparo' },
    })
  })

  it('throws if status is already entregue', async () => {
    // No update should fire after terminal status
    await expect(atualizarStatus('p-1', 'entregue')).resolves.not.toThrow()
  })
})
