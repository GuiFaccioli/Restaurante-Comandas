import { ProfileMenu } from '@/components/auth/profile-menu'
import { AdminShellNav } from '@/components/admin/admin-shell-nav'
import { MobileBottomNavigation } from '@/components/shell/mobile-bottom-navigation'
import { getCurrentAccesses } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const accesses = await getCurrentAccesses()
  const primaryLinks = [
    { href: '/admin/menu', label: 'Cardápio', description: 'Função futura · delivery e outros canais' },
    { href: '/admin/estoque/insumos', label: 'Estoque', description: 'Insumos e fichas técnicas' },
    { href: '/admin/mesas', label: 'Mesas', description: 'Salão e atendimento' },
    ...(accesses.includes('caixa') ? [{ href: '/admin/pedidos', label: 'Pedidos', description: 'Caixa e pagamentos' }] : []),
    { href: '/admin/relatorios', label: 'Relatórios', description: 'Perguntas da operação' },
  ]
  const managementLinks = [
    { href: '/admin/usuarios', label: 'Equipe', description: 'Acessos e perfis do sistema' },
    { href: '/admin/configuracoes', label: 'Configurações', description: 'Operação e parâmetros gerais' },
  ]

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <div className="mx-auto grid min-h-dvh max-w-[1600px] grid-cols-1 lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
        <aside className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div>
              <p className="text-lg font-bold tracking-[-0.03em] text-[var(--primary-active)]">Agiliza Fluxo</p>
              <p className="mt-1 max-w-52 text-sm leading-5 text-[var(--muted)]">Mais produtividade, menos papel.</p>
            </div>
            <ProfileMenu className="shrink-0 lg:hidden" currentAccess="admin" />
          </div>

          <div className="mt-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Operação</p>
            <div className="grid gap-1"><AdminShellNav links={primaryLinks} variant="management" /></div>
          </div>
          <div className="mt-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Administração</p>
            <div className="grid gap-1"><AdminShellNav links={managementLinks} variant="management" /></div>
          </div>
          <div className="mt-7 hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--primary-soft)] p-3 text-xs leading-5 text-[var(--body)] lg:block">
            Do pedido ao estoque, tudo conectado.
          </div>
        </aside>

        <div className="min-w-0">
          <nav className="sticky top-0 z-40 hidden border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-6 py-3 backdrop-blur lg:block">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Operação do restaurante</p>
                <p className="text-xs text-[var(--muted)]">Tudo no fluxo certo.</p>
              </div>
              <ProfileMenu className="shrink-0" currentAccess="admin" />
            </div>
          </nav>
          <main className="min-w-0 px-4 py-4 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
            <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-6 lg:p-7">{children}</div>
          </main>
        </div>
      </div>
      <MobileBottomNavigation mode="admin" />
    </div>
  )
}
