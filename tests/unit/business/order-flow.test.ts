import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

const persistedOrdersSurface = existsSync(join(root, 'app/(admin)/pedidos/page.tsx'))
  ? 'app/(admin)/pedidos/page.tsx'
  : 'app/(garcom)/pedidos/page.tsx'

describe('pedido business flow', () => {
  test('garcom mesa screen does not create a kitchen-visible pedido before confirmation', () => {
    const pageSource = source('app/(garcom)/mesa/[id]/page.tsx')
    const clientSource = source('app/(garcom)/mesa/[id]/client.tsx')

    expect(pageSource).not.toContain('criarPedido')
    expect(pageSource).not.toContain('adicionarItem')
    expect(pageSource).not.toContain('enviarPedido')
    expect(clientSource).not.toContain('criarPedido')
    expect(clientSource).not.toContain('adicionarItem')
    expect(clientSource).not.toContain('enviarPedido')
    expect(clientSource).toContain('CartDrawer')
  })

  test('garcom confirms the full cart in one official business action', () => {
    const drawerSource = source('components/garcom/cart-drawer.tsx')

    expect(drawerSource).toContain('confirmarPedido')
    expect(drawerSource).not.toContain('criarPedido')
    expect(drawerSource).not.toContain('adicionarItem')
    expect(drawerSource).not.toContain('enviarPedido')
  })

  test('cart confirmation copy communicates officialization', () => {
    const drawerSource = source('components/garcom/cart-drawer.tsx')

    expect(drawerSource).toContain('Confirmar pedido')
    expect(drawerSource).toContain('Confirmando')
    expect(drawerSource).toContain('Não foi possível confirmar o pedido')
  })

  test('kitchen and persisted orders surfaces read persisted pedidos instead of cart state', () => {
    const kitchenSource = source('app/(cozinha)/dashboard/page.tsx')
    const persistedOrdersSource = source(persistedOrdersSurface)

    expect(kitchenSource).toContain('from(pedido)')
    expect(persistedOrdersSource).toContain('from(pedido)')
    expect(kitchenSource).not.toContain('useCart')
    expect(persistedOrdersSource).not.toContain('useCart')
  })
})
