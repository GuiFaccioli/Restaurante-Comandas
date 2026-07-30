import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const source = (path: string) => readFileSync(join(root, path), 'utf8')

describe('inventory and waiter menu workflows', () => {
  it('exposes configurable minimum and ideal stock thresholds in create and edit flows', () => {
    const client = source('app/admin/estoque/client.tsx')

    expect(client).toContain('estoqueMinimo: newIngredient.estoqueMinimo')
    expect(client).toContain('estoqueIdeal: newIngredient.estoqueIdeal')
    expect(client).toContain('id="insumo-minimo"')
    expect(client).toContain('id="insumo-ideal"')
    expect(client).toContain('id="editar-insumo-minimo"')
    expect(client).toContain('id="editar-insumo-ideal"')
  })

  it('lists registered technical sheets and reuses the existing editor selection', () => {
    const client = source('app/admin/estoque/client.tsx')

    expect(client).toContain('recipeProducts')
    expect(client).toContain('Fichas registradas')
    expect(client).toContain('Nenhuma ficha técnica foi registrada ainda.')
    expect(client).toContain('aria-pressed={selectedProdutoId === product.id}')
    expect(client).toContain('onClick={() => selectProduct(product.id)}')
  })

  it('keeps the waiter menu alphabetical and image-free without changing stock fields', () => {
    const page = source('app/garcom/mesa/[id]/page.tsx')
    const grid = source('components/garcom/menu-grid.tsx')
    const card = source('components/garcom/item-card.tsx')

    expect(page).toContain('orderBy(asc(produto.nome))')
    expect(grid).toContain("localeCompare(b.nome, 'pt-BR')")
    expect(card).not.toContain('imagemUrl')
    expect(card).toContain('estoqueInsuficiente')
    expect(card).toContain('addItem')
  })
})
