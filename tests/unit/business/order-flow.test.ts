import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('pedido business flow', () => {
  test('garcom mesa screen does not create a kitchen-visible pedido before confirmation', () => {
    const pageSource = source('app/garcom/mesa/[id]/page.tsx')
    const clientSource = source('app/garcom/mesa/[id]/client.tsx')

    expect(pageSource).not.toContain('criarPedido')
    expect(pageSource).not.toContain('adicionarItem')
    expect(pageSource).not.toContain('enviarPedido')
    expect(clientSource).not.toContain('criarPedido')
    expect(clientSource).not.toContain('adicionarItem')
    expect(clientSource).not.toContain('enviarPedido')
    expect(clientSource).toContain('CartDrawer')
  })

  test('garcom screens filter sqlite booleans without binding raw true', () => {
    const mesasSource = source('app/garcom/mesas/page.tsx')
    const menuSource = source('app/garcom/mesa/[id]/page.tsx')

    expect(mesasSource).toContain('= 1')
    expect(menuSource).toContain('= 1')
    expect(mesasSource).not.toContain('eq(mesa.ativa, true)')
    expect(menuSource).not.toContain('eq(produto.disponivel, true)')
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
    expect(drawerSource).toContain('Pedido concluído com sucesso.')
  })

  test('kitchen and admin persisted-order surfaces read persisted pedidos instead of cart state', () => {
    const kitchenSource = source('app/cozinha/dashboard/page.tsx')
    const adminPedidosPath = 'app/admin/pedidos/page.tsx'
    const adminClient = source('app/admin/pedidos/client.tsx')

    expect(existsSync(join(root, 'app/cozinha/dashboard/page.tsx'))).toBe(true)
    expect(existsSync(join(root, adminPedidosPath))).toBe(true)

    const adminSource = source(adminPedidosPath)

    expect(kitchenSource).toContain('from(pedido)')
    expect(adminSource).toContain('getCashierOrders')
    expect(source('lib/orders/queries.ts')).toContain('from(pedido)')
    expect(adminClient).toContain('SseListener')
    expect(adminClient).toContain('Pedido recebido da Mesa')
    expect(kitchenSource).not.toContain('useCart')
    expect(adminSource).not.toContain('useCart')
  })

  test('kitchen is a visual-only board of open comandas', () => {
    const kitchenSource = source('app/cozinha/dashboard/page.tsx')
    const cardSource = source('components/cozinha/pedido-card.tsx')
    const boardSource = source('components/cozinha/kanban-board.tsx')

    expect(kitchenSource).toContain("eq(pedido.status, 'novo')")
    expect(kitchenSource).not.toContain('inArray(pedido.status')
    expect(cardSource).not.toContain('atualizarStatus')
    expect(cardSource).not.toContain('onStatusChange')
    expect(cardSource).not.toContain('Iniciar Preparo')
    expect(cardSource).not.toContain('Marcar Pronto')
    expect(cardSource).toContain('LiveElapsedTimer')
    expect(boardSource).not.toContain('COLUMNS')
    expect(boardSource).toContain("status === 'entregue'")
    expect(boardSource).toContain("status === 'cancelado'")
  })

  test('waiter pending deliveries page is the first waiter workflow screen', () => {
    const accessSource = source('lib/auth/access.ts')
    const pageSource = source('app/garcom/pedidos/page.tsx')
    const clientSource = source('components/garcom/pending-deliveries-client.tsx')

    expect(accessSource).toContain("garcom: '/garcom/pedidos'")
    expect(pageSource).toContain("requireAccess('garcom')")
    expect(pageSource).toContain('from(pedido)')
    expect(pageSource).toContain("eq(pedido.status, 'novo')")
    expect(pageSource).toContain('PendingDeliveriesClient')
    expect(pageSource).not.toContain("redirect('/garcom/mesas')")
    expect(clientSource).toContain('confirmarEntrega')
    expect(clientSource).toContain('Confirmar entrega')
    expect(clientSource).toContain("href=\"/garcom/mesas\"")
  })
})
