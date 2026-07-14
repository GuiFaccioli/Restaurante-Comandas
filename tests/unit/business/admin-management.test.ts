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
    const shellNav = source('components/admin/admin-shell-nav.tsx')

    expect(layout).toContain('<aside')
    expect(layout).toContain('AdminShellNav')
    expect(shellNav).toContain('usePathname')
    expect(shellNav).toContain('aria-current')
    expect(shellNav).toContain('page')
    expect(layout).toContain('/admin/relatorios')
    expect(layout).toContain('/admin/usuarios')
    expect(layout).toContain('/admin/configuracoes')
  })

  it('uses one progressive category manager without the old category cards', () => {
    const menuClient = source('app/admin/menu/client.tsx')
    const categoryManager = source('components/admin/category-manager.tsx')

    expect(menuClient).toContain('<CategoryManager')
    expect(menuClient).not.toContain('title="Nova categoria"')
    expect(menuClient).not.toContain('Renomear categoria</Button>')
    expect(categoryManager).toContain('aria-label="Adicionar categoria"')
    expect(categoryManager).toContain('aria-label={`Editar categoria ${category.nome}`}')
    expect(categoryManager).toContain('<TooltipContent>Editar categoria</TooltipContent>')
    expect(categoryManager).toContain('aria-busy=')
    expect(categoryManager).toContain('role="alert"')
  })

  it('uses real semantic product actions and the existing server names', () => {
    const menuClient = source('app/admin/menu/client.tsx')
    const productActions = source('lib/actions/produtos.ts')

    expect(menuClient).toContain('toggleDisponivel')
    expect(productActions).toContain('editarCategoria')
    expect(productActions).toContain('removerCategoria')
    expect(productActions).toContain('removerProduto')
    expect(productActions).toContain("requireAccess('admin')")
    expect(menuClient).toContain('Tornar indisponível')
    expect(menuClient).toContain('Disponibilizar')
    expect(menuClient).toContain('aria-label={`Editar produto ${p.nome}`}')
    expect(menuClient).toContain('aria-label={`Excluir produto ${p.nome}`}')
    expect(menuClient).not.toContain('<Badge')
  })

  it('has admin reports, users, and settings pages', () => {
    expect(existsSync(join(root, 'app/admin/relatorios/page.tsx'))).toBe(true)
    expect(existsSync(join(root, 'app/admin/usuarios/page.tsx'))).toBe(true)
    expect(existsSync(join(root, 'app/admin/configuracoes/page.tsx'))).toBe(true)
  })

  it('users admin manages accesses without exposing legacy cargo editing', () => {
    const usersPage = source('app/admin/usuarios/page.tsx')
    const userActions = source('lib/actions/usuarios.ts')

    expect(userActions).toContain('atualizarUsuarioAdmin')
    expect(userActions).toContain('removerUsuarioDoRestaurante')
    expect(userActions).toContain("requireAccess('admin')")
    expect(userActions).toContain('tenantUser')
    expect(userActions).toContain('usuarioAcesso')
    expect(userActions).toContain('VALID_ACCESSES')
    expect(userActions).not.toContain('VALID_ROLES')
    expect(userActions).not.toContain("formString(data, 'role')")
    expect(userActions).not.toContain('Cargo inválido')
    expect(userActions).not.toContain('.set({ role')

    expect(usersPage).not.toContain('ROLE_OPTIONS')
    expect(usersPage).not.toContain('Cargo')
    expect(usersPage).not.toContain('name="role"')
    expect(usersPage).toContain('Acessos')
    expect(usersPage).toContain('Administração')
    expect(usersPage).toContain('Caixa')
    expect(usersPage).toContain('Cozinha')
    expect(usersPage).toContain('Garçom')
    expect(usersPage).toContain('Usuários e acessos')
    expect(usersPage).toContain('Permissões por usuário')
    expect(usersPage).toContain('Com múltiplos acessos')
    expect(usersPage).toContain('Salvar acessos')
    expect(usersPage).toContain('Remover usuário')
    expect(usersPage).toContain('atualizarUsuarioAdmin')
    expect(usersPage).toContain('removerUsuarioDoRestaurante')
    expect(usersPage).toContain("import { Button } from '@/components/ui/button'")
    expect(usersPage).toMatch(/intent="positive"[\s\S]*Salvar acessos/)
    expect(usersPage).toMatch(/intent="destructive"[\s\S]*Remover usuário/)
    expect(usersPage).not.toContain('<button')
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
    expect(reportsPage).toContain('Leituras operacionais')
    expect(reportsPage).toContain('AdminBar')
    expect(reportsPage).toContain('maxStatusCount')
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

  it('admin table and product forms expose labels and empty states', () => {
    const mesasSource = source('app/admin/mesas/client.tsx')
    const productFormSource = source('components/admin/produto-form.tsx')
    const buttonSource = source('components/ui/button.tsx')

    expect(mesasSource).toContain('htmlFor="numero-mesa"')
    expect(mesasSource).toContain('id="numero-mesa"')
    expect(mesasSource).toContain('Nenhuma mesa cadastrada')
    expect(mesasSource).toContain('aria-pressed')
    expect(mesasSource).not.toContain('<Badge')
    expect(mesasSource).toContain("intent={m.ativa ? 'warning' : 'positive'}")
    expect(mesasSource).toContain("m.ativa ? 'Desativar' : 'Ativar'")

    expect(productFormSource).toContain('htmlFor="produto-nome"')
    expect(productFormSource).toContain('id="produto-nome"')
    expect(productFormSource).toContain('htmlFor="produto-descricao"')
    expect(productFormSource).toContain('id="produto-descricao"')
    expect(productFormSource).toContain('htmlFor="produto-preco"')
    expect(productFormSource).toContain('id="produto-preco"')
    expect(productFormSource).toContain('htmlFor="produto-imagem-url"')
    expect(productFormSource).toContain('id="produto-imagem-url"')
    expect(productFormSource).toMatch(/intent="neutral"[\s\S]*Cancelar/)
    expect(productFormSource).toMatch(/intent="positive"[\s\S]*Salvar/)
    expect(productFormSource).toContain('aria-busy={saving}')

    expect(buttonSource).toContain('intent:')
    expect(buttonSource).toContain('appearance:')
  })
})
