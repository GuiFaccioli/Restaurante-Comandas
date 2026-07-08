import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('admin management area', () => {
  it('uses a right-side management sidebar with key admin destinations', () => {
    const layout = source('app/admin/layout.tsx')

    expect(layout).toContain('<aside')
    expect(layout).toContain('/admin/relatorios')
    expect(layout).toContain('/admin/usuarios')
    expect(layout).toContain('/admin/configuracoes')
  })

  it('menu category creation is explicit instead of looking like search', () => {
    const menuClient = source('app/admin/menu/client.tsx')

    expect(menuClient).toContain('Nome da nova categoria')
    expect(menuClient).toContain('Adicionar Categoria')
  })

  it('menu admin can edit and remove products and categories intentionally', () => {
    const menuClient = source('app/admin/menu/client.tsx')
    const productActions = source('lib/actions/produtos.ts')

    expect(productActions).toContain('editarCategoria')
    expect(productActions).toContain('removerCategoria')
    expect(productActions).toContain('removerProduto')
    expect(productActions).toContain('requireAccess(\'admin\')')

    expect(menuClient).toContain('Renomear categoria')
    expect(menuClient).toContain('Excluir categoria')
    expect(menuClient).toContain('Excluir produto')
    expect(menuClient).toContain('removerProduto')
    expect(menuClient).toContain('removerCategoria')
  })

  it('has admin reports, users, and settings pages', () => {
    expect(existsSync(join(root, 'app/admin/relatorios/page.tsx'))).toBe(true)
    expect(existsSync(join(root, 'app/admin/usuarios/page.tsx'))).toBe(true)
    expect(existsSync(join(root, 'app/admin/configuracoes/page.tsx'))).toBe(true)
  })

  it('users admin can update roles, accesses, and remove tenant membership', () => {
    const usersPage = source('app/admin/usuarios/page.tsx')
    const userActions = source('lib/actions/usuarios.ts')

    expect(userActions).toContain('atualizarUsuarioAdmin')
    expect(userActions).toContain('removerUsuarioDoRestaurante')
    expect(userActions).toContain("requireAccess('admin')")
    expect(userActions).toContain('tenantUser')
    expect(userActions).toContain('usuarioAcesso')

    expect(usersPage).toContain('Cargo')
    expect(usersPage).toContain('Acessos')
    expect(usersPage).toContain('Salvar usuário')
    expect(usersPage).toContain('Remover usuário')
    expect(usersPage).toContain('atualizarUsuarioAdmin')
    expect(usersPage).toContain('removerUsuarioDoRestaurante')
  })

  it('reports page is backed by existing order, item, product, and category data', () => {
    const reportsPage = source('app/admin/relatorios/page.tsx')

    expect(reportsPage).toContain("requireAccess('admin')")
    expect(reportsPage).toContain('from(pedido)')
    expect(reportsPage).toContain('innerJoin(itemPedido')
    expect(reportsPage).toContain('innerJoin(produto')
    expect(reportsPage).toContain('innerJoin(categoria')
    expect(reportsPage).toContain('Faturamento estimado')
    expect(reportsPage).toContain('Produtos mais vendidos')
    expect(reportsPage).toContain('Ideias possíveis')
  })

  it('reports page derives delivery timing metrics from delivered orders only', () => {
    const reportsPage = source('app/admin/relatorios/page.tsx')

    expect(reportsPage).toContain('entregueEm: pedido.entregueEm')
    expect(reportsPage).toContain('deliveryDurations')
    expect(reportsPage).toContain("order.status === 'entregue'")
    expect(reportsPage).toContain('order.entregueEm')
    expect(reportsPage).toContain('Tempo médio de entrega')
    expect(reportsPage).toContain('Pedidos entregues medidos')
  })
})
