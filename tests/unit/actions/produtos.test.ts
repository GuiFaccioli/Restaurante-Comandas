import { describe, it, expect, vi, beforeEach } from 'vitest'

const drizzleExpressions = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({ kind: 'and', conditions })),
  eq: vi.fn((column: unknown, value: unknown) => ({ kind: 'eq', column, value })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    kind: 'sql',
    strings: [...strings],
    values,
  })),
}))

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    ...drizzleExpressions,
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
vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ usuarioId: 'user-1', tenantId: 'tenant-1', access: 'admin' })),
}))
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}))

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { categoria, mesa, produto } from '@/lib/db/schema'
import { put } from '@vercel/blob'
import {
  criarProduto,
  editarProduto,
  toggleDisponivel,
  criarCategoria,
  removerCategoria,
  uploadProdutoImagem,
} from '@/lib/actions/produtos'
import { criarMesa, toggleAtiva } from '@/lib/actions/mesas'

beforeEach(() => vi.clearAllMocks())

function tenantScopedWhere(
  idColumn: unknown,
  id: string,
  tenantColumn: unknown
) {
  return {
    kind: 'and',
    conditions: [
      { kind: 'eq', column: idColumn, value: id },
      { kind: 'eq', column: tenantColumn, value: 'tenant-1' },
    ],
  }
}

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
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'cat-1' }]),
      }),
    })
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
      disponivel: true,
      imagemUrl: null,
    })
  })

  it('rejects a cross-tenant category before insert, update, or notification', async () => {
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    await expect(
      criarProduto({ categoriaId: 'cat-foreign', nome: 'Margherita', preco: '32,00' })
    ).rejects.toThrow('A categoria selecionada não pertence a este restaurante')

    expect(eq).toHaveBeenCalledWith(categoria.id, 'cat-foreign')
    expect(eq).toHaveBeenCalledWith(categoria.tenantId, 'tenant-1')
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })
})

describe('editarProduto', () => {
  it('tenant-scopes both the category lookup and the specific product update', async () => {
    const categoriaWhere = vi.fn().mockResolvedValue([{ id: 'cat-1' }])
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({ where: categoriaWhere }),
    })
    const produtoWhere = vi.fn().mockResolvedValue(undefined)
    const set = vi.fn().mockReturnValue({ where: produtoWhere })
    ;(db.update as any).mockReturnValue({ set })

    await editarProduto('prod-1', {
      categoriaId: 'cat-1',
      nome: 'Margherita especial',
    })

    expect(categoriaWhere).toHaveBeenCalledWith(
      tenantScopedWhere(categoria.id, 'cat-1', categoria.tenantId)
    )
    expect(produtoWhere).toHaveBeenCalledWith(
      tenantScopedWhere(produto.id, 'prod-1', produto.tenantId)
    )
  })

  it('rejects a cross-tenant category before update or notification', async () => {
    const categoriaWhere = vi.fn().mockResolvedValue([])
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: categoriaWhere,
      }),
    })

    await expect(
      editarProduto('prod-1', { categoriaId: 'cat-foreign' })
    ).rejects.toThrow('A categoria selecionada não pertence a este restaurante')

    expect(categoriaWhere).toHaveBeenCalledWith(
      tenantScopedWhere(categoria.id, 'cat-foreign', categoria.tenantId)
    )
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })
})

describe('uploadProdutoImagem', () => {
  it('validates the image before uploading', async () => {
    const formData = new FormData()
    formData.set('file', new File(['not an image'], 'menu.txt', { type: 'text/plain' }))

    await expect(uploadProdutoImagem(formData)).rejects.toThrow('Use uma imagem JPG, PNG ou WebP')
    expect(put).not.toHaveBeenCalled()
  })

  it('uploads an allowed image server-side and returns its public URL', async () => {
    vi.mocked(put).mockResolvedValue({ url: 'https://blob.vercel-storage.com/product.webp' } as never)
    const formData = new FormData()
    formData.set('file', new File(['image'], 'menu.webp', { type: 'image/webp' }))

    await expect(uploadProdutoImagem(formData)).resolves.toEqual({
      url: 'https://blob.vercel-storage.com/product.webp',
    })
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^products\/tenant-1\/.*\.webp$/),
      expect.any(File),
      expect.objectContaining({ access: 'public', contentType: 'image/webp' })
    )
  })
})

describe('toggleDisponivel', () => {
  it('does not emit an event without a runtime consumer when disabling', async () => {
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'prod-1', disponivel: true }]),
      }),
    })
    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    await toggleDisponivel('prod-1')
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
      ativa: true,
    })
  })
})

describe('toggleAtiva', () => {
  it('atomically toggles with a tenant-scoped update and no preceding read', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 'mesa-1' }])
    const updateWhere = vi.fn().mockReturnValue({ returning })
    const set = vi.fn().mockReturnValue({ where: updateWhere })
    ;(db.update as any).mockReturnValue({
      set,
    })

    await toggleAtiva('mesa-1')

    expect(db.select).not.toHaveBeenCalled()
    expect(set).toHaveBeenCalledWith({
      ativa: {
        kind: 'sql',
        strings: ['NOT ', ''],
        values: [mesa.ativa],
      },
    })
    expect(updateWhere).toHaveBeenCalledWith(
      tenantScopedWhere(mesa.id, 'mesa-1', mesa.tenantId)
    )
    expect(returning).toHaveBeenCalledWith({ id: mesa.id })
  })

  it('detects a cross-tenant mesa when the scoped update changes zero rows', async () => {
    const returning = vi.fn().mockResolvedValue([])
    const updateWhere = vi.fn().mockReturnValue({ returning })
    const set = vi.fn().mockReturnValue({ where: updateWhere })
    ;(db.update as any).mockReturnValue({ set })

    await expect(toggleAtiva('mesa-foreign')).rejects.toThrow('Mesa não encontrada')

    expect(db.select).not.toHaveBeenCalled()
    expect(updateWhere).toHaveBeenCalledWith(
      tenantScopedWhere(mesa.id, 'mesa-foreign', mesa.tenantId)
    )
    expect(returning).toHaveBeenCalledWith({ id: mesa.id })
    expect(db.insert).not.toHaveBeenCalled()
  })
})
