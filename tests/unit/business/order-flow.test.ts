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
    expect(pageSource).not.toContain('href="/garcom/mesas"')
    expect(clientSource).toContain('confirmarEntrega')
    expect(clientSource).toContain('Confirmar entrega')
    expect(clientSource).toContain("href=\"/garcom/mesas\"")
  })

  test('waiter pending deliveries UI keeps mobile actions readable', () => {
    const pageSource = source('app/garcom/pedidos/page.tsx')
    const clientSource = source('components/garcom/pending-deliveries-client.tsx')

    expect(pageSource).toContain('mx-auto')
    expect(pageSource).toContain('max-w-3xl')
    expect(pageSource).toContain('text-pretty')
    expect(clientSource).toContain('flex-col')
    expect(clientSource).toContain('sm:flex-row')
    expect(clientSource).toContain('w-full sm:w-auto')
    expect(clientSource).toContain('items-stretch')
  })

  test('core operational screens keep mobile-first visual structure', () => {
    const mesasSource = source('app/garcom/mesas/page.tsx')
    const kitchenSource = source('app/cozinha/dashboard/page.tsx')
    const boardSource = source('components/cozinha/kanban-board.tsx')
    const cardSource = source('components/cozinha/pedido-card.tsx')

    expect(mesasSource).toContain('mx-auto')
    expect(mesasSource).toContain('max-w-4xl')
    expect(mesasSource).toContain('focus-visible:ring-2')
    expect(mesasSource).toContain('text-pretty')

    expect(kitchenSource).toContain('min-h-[calc(100dvh-4rem)]')
    expect(kitchenSource).toContain('text-pretty')
    expect(kitchenSource).not.toContain('h-screen')

    expect(boardSource).toContain('min-h-[10rem]')
    expect(boardSource).toContain('text-pretty')

    expect(cardSource).toContain('min-w-0')
    expect(cardSource).toContain('break-words')
    expect(cardSource).toContain('Aberto há')
  })

  test('waiter table ordering flow keeps touch-first visual structure', () => {
    const clientSource = source('app/garcom/mesa/[id]/client.tsx')
    const menuSource = source('components/garcom/menu-grid.tsx')
    const scrollSource = source('components/operational/scroll-to-top.tsx')
    const deliveriesPageSource = source('app/garcom/pedidos/page.tsx')
    const kitchenPageSource = source('app/cozinha/dashboard/page.tsx')
    const itemSource = source('components/garcom/item-card.tsx')
    const drawerSource = source('components/garcom/cart-drawer.tsx')
    const sheetSource = source('components/garcom/observacao-sheet.tsx')
    const tableOrdersSource = source('components/garcom/table-orders-panel.tsx')
    const fabSource = source('components/garcom/cart-fab.tsx')

    expect(clientSource).toContain('mx-auto')
    expect(clientSource).toContain('max-w-4xl')
    expect(clientSource).toContain('text-pretty')
    expect(clientSource).not.toContain('Monte pedidos e acompanhe entregas sem sair da mesa.')
    expect(clientSource).toContain('w-full sm:w-auto')

    expect(menuSource).toContain('grid-cols-1')
    expect(menuSource).toContain('sm:grid-cols-2')
    expect(menuSource).toContain('lg:grid-cols-3')
    expect(menuSource).toContain('grid-cols-2')
    expect(menuSource).toContain('grid !h-auto min-h-0 w-full')
    expect(menuSource).toContain('min-h-11 w-full px-3')
    expect(menuSource).toContain('data-active:border-[var(--success)]')
    expect(menuSource).toContain('overflow-y-auto')
    expect(clientSource).toContain('h-[100dvh]')
    expect(menuSource).not.toContain('overflow-x-auto')
    expect(clientSource).toContain('<ScrollToTopButton />')
    expect(deliveriesPageSource).toContain('<ScrollToTopButton />')
    expect(kitchenPageSource).toContain('<ScrollToTopButton />')
    expect(scrollSource).toContain("window.scrollTo({ top: 0, behavior: 'smooth' })")
    expect(scrollSource).not.toContain('setTimeout')

    expect(itemSource).toContain('bg-card')
    expect(itemSource).toContain('min-w-0')
    expect(itemSource).toContain('break-words')
    expect(itemSource).toContain('Indisponível')

    expect(drawerSource).toContain('min-h-11')
    expect(drawerSource).toContain('break-words')
    expect(drawerSource).toContain('Editar observação')

    expect(sheetSource).toContain('Observação')
    expect(sheetSource).toContain('sem cebola, bem passado')

    expect(tableOrdersSource).not.toContain('Nenhum pedido confirmado nesta mesa')
    expect(tableOrdersSource).not.toContain('rounded-[var(--radius)] border bg-card p-4')
    expect(tableOrdersSource).toContain('expandedIds.includes(pedido.id)')
    expect(tableOrdersSource).toContain('toggleExpanded')
    expect(tableOrdersSource).not.toContain('expandedId === pedido.id')
    expect(tableOrdersSource).not.toContain('setExpandedId(expanded ? null : pedido.id)')

    expect(fabSource).toContain('aria-label="Abrir carrinho"')
    expect(fabSource).toContain('bottom-4')
  })

  test('cashier order management keeps readable payment UI', () => {
    const layoutSource = source('app/admin/layout.tsx')
    const pageSource = source('app/admin/pedidos/page.tsx')
    const clientSource = source('app/admin/pedidos/client.tsx')

    expect(layoutSource).toContain('Painel admin')
    expect(layoutSource).toContain('bg-[var(--admin-canvas)]')
    expect(layoutSource).toContain('lg:grid-cols-[292px_minmax(0,1fr)]')
    expect(layoutSource).toContain('max-w-[1600px]')
    expect(layoutSource).toContain('AdminShellNav')
    expect(layoutSource).toContain('lg:h-dvh')
    expect(layoutSource).toContain('Interface otimizada para uso em computador.')
    expect(layoutSource).toContain('Relatórios')
    expect(layoutSource).toContain('Usuários cadastrados')
    expect(layoutSource).toContain('Configurações')
    expect(layoutSource).toContain('Gestão')

    expect(pageSource).toContain('AdminPage')
    expect(pageSource).toContain('AdminPageHeader')
    expect(pageSource).toContain('Pedidos e caixa')

    expect(clientSource).toContain('Crédito')
    expect(clientSource).toContain('Débito')
    expect(clientSource).toContain('Não foi possível registrar o pagamento.')
    expect(clientSource).toContain('AdminStatsGrid')
    expect(clientSource).toContain('Fila do caixa')
    expect(clientSource).toContain('min-w-0')
    expect(clientSource).toContain('break-words')
    expect(clientSource).toContain('min-h-11')
    expect(clientSource).toContain(' · ')
    expect(clientSource).toContain('const firstPaymentPedido = initialPedidos.find(isAwaitingPayment)')
    expect(clientSource).toContain('title="Pagamentos aguardando baixa"')
    expect(clientSource).not.toContain("'Abrir pedido'")
  })

  test('admin management screens keep readable responsive UI', () => {
    const configSource = source('app/admin/configuracoes/page.tsx')
    const reportsSource = source('app/admin/relatorios/page.tsx')
    const usersSource = source('app/admin/usuarios/page.tsx')
    const mesasSource = source('app/admin/mesas/client.tsx')
    const menuSource = source('app/admin/menu/client.tsx')
    const productFormSource = source('components/admin/produto-form.tsx')

    expect(configSource).toContain('AdminPage')
    expect(configSource).toContain('AdminStatsGrid')
    expect(configSource).toContain('Configurações')
    expect(configSource).toContain('Cardápio')
    expect(configSource).toContain('focus-visible:ring-2')

    expect(reportsSource).toContain('AdminPage')
    expect(reportsSource).toContain('AdminStatsGrid')
    expect(reportsSource).toContain('AdminBar')
    expect(reportsSource).toContain('Relatórios')
    expect(reportsSource).toContain('Ticket médio estimado')
    expect(reportsSource).toContain('maxStatusCount')

    expect(usersSource).toContain('AdminPage')
    expect(usersSource).toContain('AdminStatsGrid')
    expect(usersSource).toContain('Usuários e acessos')
    expect(usersSource).toContain('Garçom')
    expect(usersSource).toContain('min-h-11')

    expect(mesasSource).toContain('AdminPage')
    expect(mesasSource).toContain('AdminStatsGrid')
    expect(mesasSource).toContain('Número da mesa')
    expect(mesasSource).toContain('Nenhuma mesa cadastrada')
    expect(mesasSource).toContain('min-h-11')

    expect(menuSource).toContain('lg:grid-cols-[220px_minmax(0,1fr)]')
    expect(menuSource).toContain('Produtos nesta categoria')
    expect(menuSource).toContain('Disponibilizar')
    expect(menuSource).toContain('Tornar indisponível')
    expect(menuSource).toContain('min-h-11')

    expect(productFormSource).toContain('Descrição')
    expect(productFormSource).toContain('Preço (R$)')
    expect(productFormSource).toContain('Salvando…')
  })

  test('access and auth screens keep readable responsive UI', () => {
    const signInPageSource = source('app/auth/sign-in/page.tsx')
    const signInClientSource = source('app/auth/sign-in/client.tsx')
    const signUpSource = source('app/auth/sign-up/page.tsx')
    const areaSource = source('app/selecionar-area/page.tsx')
    const companySource = source('app/selecionar-empresa/page.tsx')
    const deniedSource = source('app/sem-acesso/page.tsx')

    expect(signInPageSource).toContain('min-h-dvh')
    expect(signInPageSource).toContain('Não tem conta?')
    expect(signInPageSource).toContain('rounded-[var(--radius)]')
    expect(signInClientSource).toContain('min-h-11')

    expect(signUpSource).toContain('min-h-dvh')
    expect(signUpSource).toContain('Criar conta')
    expect(signUpSource).toContain('Já tem conta?')
    expect(signUpSource).toContain('min-h-11')

    expect(areaSource).toContain('Selecionar área')
    expect(areaSource).toContain('você')
    expect(areaSource).toContain('text-pretty')
    expect(areaSource).toContain('focus-visible:ring-2')

    expect(companySource).toContain('Selecionar empresa')
    expect(companySource).toContain('você')
    expect(companySource).toContain('text-pretty')
    expect(companySource).toContain('appearance="outline"')

    expect(deniedSource).toContain('Seu usuário não tem permissão')
    expect(deniedSource).toContain('Trocar área')
    expect(deniedSource).toContain('w-full sm:w-auto')
  })
})
