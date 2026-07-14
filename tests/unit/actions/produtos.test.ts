import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    eq: vi.fn(actual.eq),
  }
})
vi.mock('@/lib/db/index', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  },
}))
vi.mock('@/lib/sse', () => ({ notifyKitchen: vi.fn() }))
vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ usuarioId: 'user-1', tenantId: 'tenant-1', access: 'admin' })),
}))

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { categoria, produto } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'
import {
  criarProduto,
  toggleDisponivel,
  criarCategoria,
  removerCategoria,
} from '@/lib/actions/produtos'
import { criarMesa } from '@/lib/actions/mesas'

beforeEach(() => vi.clearAllMocks())

describe('criarCategoria', () => {
  it('trims the name, appends after the tenant max order, and returns id plus name', async () => {
    const where = vi.fn().mockResolvedValue([{ ordem: 2 }, { ordem: 7 }])
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as any).mockReturnValue({ from })

    const returning = vi.fn().mockResolvedValue([
      { id: 'cat-1', nome: 'Pizzas' },
    ])
    const values = vi.fn().mockReturnValue({ returning })
    ;(db.insert as any).mockReturnValue({ values })

    await expect(criarCategoria('  Pizzas  ')).resolves.toEqual({
      id: 'cat-1',
      nome: 'Pizzas',
    })

    expect(db.select).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledTimes(1)
    expect(where).toHaveBeenCalledTimes(1)
    expect(eq).toHaveBeenCalledWith(categoria.tenantId, 'tenant-1')
    expect(values).toHaveBeenCalledWith({
      id: expect.any(String),
      tenantId: 'tenant-1',
      nome: 'Pizzas',
      ordem: 8,
    })
    expect(returning).toHaveBeenCalledTimes(1)
  })

  it('uses order zero only for the tenant first category', async () => {
    const where = vi.fn().mockResolvedValue([])
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as any).mockReturnValue({ from })

    const returning = vi.fn().mockResolvedValue([
      { id: 'cat-1', nome: 'Pizzas' },
    ])
    const values = vi.fn().mockReturnValue({ returning })
    ;(db.insert as any).mockReturnValue({ values })

    await criarCategoria('Pizzas')

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        tenantId: 'tenant-1',
        nome: 'Pizzas',
        ordem: 0,
      })
    )
  })

  it('rejects a blank normalized name before querying or inserting', async () => {
    await expect(criarCategoria('   ')).rejects.toThrow(
      'Informe o nome da categoria'
    )

    expect(db.select).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe('removerCategoria', () => {
  it('resolves the protected result and skips delete for tenant products', async () => {
    const where = vi.fn().mockResolvedValue([{ id: 'prod-1' }])
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as any).mockReturnValue({ from })

    await expect(removerCategoria('cat-1')).resolves.toEqual({
      ok: false,
      error: 'Remova os produtos antes de excluir a categoria',
    })

    expect(eq).toHaveBeenCalledWith(produto.categoriaId, 'cat-1')
    expect(eq).toHaveBeenCalledWith(produto.tenantId, 'tenant-1')
    expect(db.delete).not.toHaveBeenCalled()
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
      tenantId: 'tenant-1',
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
      tenantId: 'tenant-1',
      numero: 5,
      ativa: 1,
    })
  })
})
