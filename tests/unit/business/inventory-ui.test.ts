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

  it('consolidates navigation around stock, recipes, and the shopping list', () => {
    expect(source('components/admin/inventory-navigation.tsx')).toContain(
      "{ href: '/admin/estoque/lista-de-compras', label: 'Lista de compras' }",
    )
    const navigation = source('components/admin/inventory-navigation.tsx')
    expect(navigation).not.toContain("label: 'Insumos'")
    expect(navigation).toContain('const active = pathname === link.href')
    expect(navigation).not.toContain('pathname.startsWith')

    const adminLayout = source('app/admin/layout.tsx')
    expect(adminLayout).toContain("href: '/admin/estoque'")
    expect(adminLayout).not.toContain('/admin/estoque/insumos')
    expect(adminLayout).not.toContain('Insumos')
  })

  it('loads and presents a separate shopping list view with idempotent confirmation', () => {
    const data = source('app/admin/estoque/data.ts')
    const client = source('app/admin/estoque/client.tsx')

    expect(data).toContain('shoppingListItems')
    expect(client).toContain("type InventoryView = 'estoque' | 'ficha' | 'lista'")
    expect(client).toContain('confirmarItemListaCompra')
    expect(client).toContain('adicionarItemManualListaCompra')
    expect(client).toContain('crypto.randomUUID()')
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

  it('keeps movement operations scoped to the currently loaded active inventory', () => {
    const client = source('app/admin/estoque/client.tsx')
    const staleSelectionGuard = client.indexOf("const movementIngredient = insumos.find((item) => item.id === movementIngredientId)")
    const lossCall = client.indexOf('registrarPerdaEstoque(movementIngredientId, movementQuantity, movementReason')

    expect(staleSelectionGuard).toBeGreaterThan(-1)
    expect(client).toContain('if (!movementIngredient) {')
    expect(client).toContain("toast.error('O item selecionado não está mais disponível. Atualize e selecione outro item.')")
    expect(staleSelectionGuard).toBeLessThan(lossCall)
  })

  it('offers only units compatible with the selected stock item in movement registration', () => {
    const client = source('app/admin/estoque/client.tsx')

    expect(client).toContain('movementUnitsFor(movementIngredient.unidadeBase)')
    expect(client).toContain('id="movimento-unidade"')
    expect(client).toContain('value={movementUnit}')
  })
})
