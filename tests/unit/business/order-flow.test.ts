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

  test('garcom screens filter PostgreSQL booleans natively', () => {
    const mesasSource = source('app/garcom/mesas/page.tsx')
    const menuSource = source('app/garcom/mesa/[id]/page.tsx')

    expect(mesasSource).toContain('getTenantMesaOperationalSummaries')
    expect(menuSource).toContain('eq(produto.disponivel, true)')
    expect(mesasSource).not.toContain('= 1')
    expect(menuSource).not.toContain('= 1')
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
    const kitchenPageSource = source('app/cozinha/dashboard/page.tsx')
    const kitchenQuerySource = source('lib/kitchen/queries.ts')
    const adminPedidosPath = 'app/admin/pedidos/page.tsx'
    const adminClient = source('app/admin/pedidos/client.tsx')

    expect(existsSync(join(root, 'app/cozinha/dashboard/page.tsx'))).toBe(true)
    expect(existsSync(join(root, adminPedidosPath))).toBe(true)

    const adminSource = source(adminPedidosPath)

    expect(kitchenPageSource).toContain('getKitchenOrders')
    expect(kitchenQuerySource).toContain('from(pedido)')
    expect(adminSource).toContain('getCashierAccounts')
    expect(source('lib/orders/queries.ts')).toContain('from(pedido)')
    expect(adminClient).toContain("fetch('/api/caixa/pedidos'")
    expect(adminClient).toContain('window.setInterval')
    expect(adminClient).toContain("document.visibilityState === 'visible'")
    expect(adminClient).not.toContain('SseListener')
    expect(adminClient).not.toContain('KitchenEvent')
    expect(kitchenPageSource).not.toContain('useCart')
    expect(adminSource).not.toContain('useCart')
  })

  test('order actions persist state without publishing in-memory SSE events', () => {
    const orderActions = source('lib/actions/pedidos.ts')

    expect(orderActions).not.toContain("from '@/lib/sse'")
    expect(orderActions).not.toContain('notifyKitchen')
  })
  test('kitchen query keeps every official active preparation state visible', () => {
    const kitchenSource = source('lib/kitchen/queries.ts')

    expect(kitchenSource).toContain("inArray(pedido.status, ['novo', 'em_preparo', 'pronto'])")
    expect(kitchenSource).toContain('eq(pedido.tenantId, tenantId)')
    expect(kitchenSource).toContain('eq(itemPedido.tenantId, tenantId)')
    expect(kitchenSource).toContain("'novo', 'em_preparo', 'pronto'")
  })

  test('waiter pending deliveries page is the first waiter workflow screen', () => {
    const accessSource = source('lib/auth/access.ts')
    const pageSource = source('app/garcom/pedidos/page.tsx')

    expect(accessSource).toContain("garcom: '/garcom/pedidos'")
    expect(pageSource).toContain("requireAccess('garcom')")
    expect(pageSource).toContain('from(pedido)')
    expect(pageSource).toContain("inArray(pedido.status, ['novo', 'em_preparo', 'pronto'])")
    expect(pageSource).toContain('PendingDeliveriesClient')
    expect(pageSource).not.toContain("redirect('/garcom/mesas')")
    expect(pageSource).not.toContain('href="/garcom/mesas"')
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
    expect(clientSource).not.toContain('Monte pedidos e acompanhe entregas sem sair da mesa.')

    expect(menuSource).toContain('grid-cols-1')
    expect(menuSource).toContain('sm:grid-cols-2')
    expect(menuSource).toContain('lg:grid-cols-3')
    expect(menuSource).toContain('grid-cols-3')
    expect(menuSource).toContain('grid !h-auto min-h-0 w-full')
    expect(menuSource).toContain('min-h-11 w-full px-2')
    expect(menuSource).toContain('data-active:border-[var(--success)]')
    expect(menuSource).toContain('overflow-y-auto')
    expect(clientSource).toContain('h-[100dvh]')
    expect(clientSource).toContain('bg-black')
    expect(clientSource).toContain('Mesa {mesaNumero}')
    const garcomLayoutSource = source('app/garcom/layout.tsx')
    const profileSlotSource = source('components/garcom/garcom-profile-slot.tsx')
    const mesasPageSource = source('app/garcom/mesas/page.tsx')
    expect(garcomLayoutSource).toContain('GarcomProfileSlot')
    expect(garcomLayoutSource).toContain('showOnOperationalPages={accesses.length > 1}')
    expect(profileSlotSource).toContain('showOnOperationalPages = false')
    expect(profileSlotSource).toContain("pathname.startsWith('/garcom/mesa/')")
    expect(profileSlotSource).toContain("pathname === '/garcom/mesas'")
    expect(mesasPageSource).toContain('Escolha uma mesa')
    expect(menuSource).not.toContain('overflow-x-auto')
    expect(clientSource).toContain('<ScrollToTopButton />')
    expect(deliveriesPageSource).toContain('<ScrollToTopButton />')
    expect(kitchenPageSource).toContain('<ScrollToTopButton />')
    expect(scrollSource).toContain("window.scrollTo({ top: 0, behavior: 'smooth' })")
    expect(scrollSource).not.toContain('setTimeout')

    expect(itemSource).toContain('bg-card')
    expect(itemSource).toContain('rounded-[var(--radius-card)]')
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
    expect(fabSource).toContain('bottom-[calc(5rem+env(safe-area-inset-bottom))]')
  })

  test('cashier order management keeps readable payment UI', () => {
    const layoutSource = source('app/admin/layout.tsx')
    const pageSource = source('app/admin/pedidos/page.tsx')
    const clientSource = source('app/admin/pedidos/client.tsx')

    expect(layoutSource).toContain('AgilizaFluxoBrand')
    expect(layoutSource).toContain('bg-[var(--canvas)]')
    expect(layoutSource).toContain('lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]')
    expect(layoutSource).toContain('max-w-[1600px]')
    expect(layoutSource).toContain('AdminShellNav')
    expect(layoutSource).toContain('lg:h-dvh')
    expect(layoutSource).toContain('Tudo no fluxo certo.')
    expect(layoutSource).toContain('Equipe')
    expect(layoutSource).toContain('Administração')

    expect(pageSource).toContain('AdminPage')
    expect(pageSource).toContain('AdminPageHeader')
    expect(pageSource).toContain('Pedidos e caixa')

    expect(clientSource).toContain('Crédito')
    expect(clientSource).toContain('Débito')
    expect(clientSource).toContain('Não foi possível registrar o pagamento.')
    expect(clientSource).not.toContain('AdminStatsGrid')
    expect(clientSource).toContain('Contas aguardando pagamento')
    expect(clientSource).toContain('min-w-0')
    expect(clientSource).toContain('break-words')
    expect(clientSource).toContain('min-h-11')
    expect(clientSource).toContain(' · ')
    expect(clientSource).toContain('const firstPayment = initialPedidos.find(canReceivePayment)')
    expect(clientSource).toContain('title="Contas aguardando pagamento"')
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
    expect(reportsSource).not.toContain('AdminStatsGrid')
    expect(reportsSource).toContain('RelatoriosAdminClient')
    expect(source('app/admin/relatorios/client.tsx')).toContain('Relatórios')
    expect(reportsSource).toContain('Ticket médio')
    expect(reportsSource).toContain('statusMap')

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

    expect(menuSource).toContain('AdminPageHeader')
    expect(menuSource).toContain('CategoryManager')
    expect(menuSource).toContain('Novo produto')

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
    expect(signInPageSource).toContain('af-surface')
    expect(signInClientSource).toContain('min-h-11')

    expect(signUpSource).toContain('min-h-dvh')
    expect(signUpSource).toContain('Criar conta')
    expect(signInPageSource).toContain('AgilizaFluxoBrand')
    expect(signUpSource).toContain('AgilizaFluxoBrand')
    expect(areaSource).toContain('AgilizaFluxoBrand')
    expect(companySource).toContain('AgilizaFluxoBrand')
    expect(signUpSource).toContain('Já tem conta?')
    expect(signUpSource).toContain('min-h-11')

    expect(areaSource).toContain('Por onde você quer começar?')
    expect(areaSource).toContain('AgilizaFluxoBrand')
    expect(areaSource).toContain('af-surface')
    expect(areaSource).toContain('focus-visible:ring-2')

    expect(companySource).toContain('Escolha o restaurante')
    expect(companySource).toContain('Selecione onde você vai trabalhar agora.')
    expect(companySource).toContain('af-surface')

    expect(deniedSource).toContain('Seu usuário não tem permissão')
    expect(deniedSource).toContain('Trocar área')
    expect(deniedSource).toContain('w-full sm:w-auto')
  })
})
