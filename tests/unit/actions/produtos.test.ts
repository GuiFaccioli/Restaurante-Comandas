import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  },
}))
vi.mock('@/lib/sse', () => ({ notifyKitchen: vi.fn() }))
vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ usuarioId: 'user-1', access: 'admin' })),
}))

import { db } from '@/lib/db/index'
import { notifyKitchen } from '@/lib/sse'
import { criarProduto, toggleDisponivel, criarCategoria } from '@/lib/actions/produtos'
import { criarMesa } from '@/lib/actions/mesas'

beforeEach(() => vi.clearAllMocks())

describe('criarCategoria', () => {
  it('inserts and returns id', async () => {
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'cat-1' }]),
    })
    ;(db.insert as any).mockReturnValue({
      values,
    })
    expect(await criarCategoria('Pizzas')).toEqual({ id: 'cat-1' })
    expect(values).toHaveBeenCalledWith({
      id: expect.any(String),
      nome: 'Pizzas',
      ordem: 0,
    })
  })
})

describe('criarProduto', () => {
  it('inserts produto and returns id', async () => {
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'prod-1' }]),
    })
    ;(db.insert as any).mockReturnValue({
      values,
    })
    const result = await criarProduto({ categoriaId: 'cat-1', nome: 'Margherita', preco: '32,00' })
    expect(result).toEqual({ id: 'prod-1' })
    expect(values).toHaveBeenCalledWith({
      id: expect.any(String),
      categoriaId: 'cat-1',
      nome: 'Margherita',
      descricao: null,
      preco: '32.00',
      disponivel: 1,
      imagemUrl: null,
    })
  })
})

describe('toggleDisponivel', () => {
  it('fires produto_indisponivel SSE when disabling', async () => {
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'prod-1', disponivel: true }]),
      }),
    })
    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    await toggleDisponivel('prod-1')
    expect(notifyKitchen).toHaveBeenCalledWith({
      type: 'produto_indisponivel',
      payload: { produtoId: 'prod-1' },
    })
  })
})

describe('criarMesa', () => {
  it('inserts mesa and returns id', async () => {
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'mesa-1' }]),
    })
    ;(db.insert as any).mockReturnValue({
      values,
    })
    expect(await criarMesa(5)).toEqual({ id: 'mesa-1' })
    expect(values).toHaveBeenCalledWith({
      id: expect.any(String),
      numero: 5,
      ativa: 1,
    })
  })
})

