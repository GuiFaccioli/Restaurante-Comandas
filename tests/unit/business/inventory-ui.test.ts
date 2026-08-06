import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('inventory interface', () => {
  it('exposes the new stock sections and item fields', () => {
    const navigation = source('components/admin/inventory-navigation.tsx')
    const client = source('app/admin/estoque/client.tsx')
    expect(navigation).toContain("/admin/estoque/lista-compras")
    expect(navigation).toContain("/admin/estoque/movimentacoes")
    expect(client).toContain('estoqueMinimo')
    expect(client).toContain('estoqueIdeal')
    expect(client).toContain('unidadeBase')
    expect(client).toContain('Registrar entrada')
  })

  it('does not expose the removed stock entity or image upload in product form', () => {
    expect(source('components/admin/produto-form.tsx')).not.toContain('uploadProdutoImagem')
  })

  it('keeps the waiter menu alphabetical and image-free', () => {
    expect(source('app/garcom/mesa/[id]/page.tsx')).toContain('orderBy(asc(produto.nome))')
    expect(source('components/garcom/menu-grid.tsx')).toContain("localeCompare(b.nome, 'pt-BR')")
    expect(source('components/garcom/item-card.tsx')).not.toContain('imagemUrl')
  })
})
