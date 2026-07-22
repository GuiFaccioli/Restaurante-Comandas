import { ProfileMenu } from '@/components/auth/profile-menu'
import { AdminShellNav } from '@/components/admin/admin-shell-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const primaryLinks = [
    { href: '/admin/menu', label: 'Cardápio', description: 'Categorias e produtos' },
    { href: '/admin/estoque', label: 'Estoque', description: 'Insumos e fichas técnicas' },
    { href: '/admin/mesas', label: 'Mesas', description: 'Salão e atendimento' },
    { href: '/admin/pedidos', label: 'Pedidos', description: 'Caixa e pagamentos' },
    { href: '/admin/relatorios', label: 'Relatórios', description: 'Consultas e tabelas' },
  ]
  const managementLinks = [
    { href: '/admin/usuarios', label: 'Usuários cadastrados', description: 'Acessos e perfis do sistema' },
    { href: '/admin/configuracoes', label: 'Configurações', description: 'Operação e parâmetros gerais' },
  ]

  return (
    <div className="min-h-screen bg-[var(--admin-canvas)]">
      <div className="mx-auto grid min-h-dvh max-w-[1600px] grid-cols-1 lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="border-b bg-background px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div>
              <p className="text-base font-bold tracking-[-0.02em]">Painel admin</p>
              <p className="mt-1 max-w-52 text-sm leading-5 text-muted-foreground">
                Operação, caixa e gestão em uma tela de trabalho.
              </p>
            </div>
            <ProfileMenu className="shrink-0 lg:hidden" currentAccess="admin" />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Operação
            </p>
            <div className="grid gap-2">
              <AdminShellNav links={primaryLinks} variant="management" />
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Gestão
            </p>
            <div className="grid gap-2">
              <AdminShellNav links={managementLinks} variant="management" />
            </div>
          </div>

          <div className="mt-6 hidden rounded-[var(--radius)] border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground lg:block">
            Use este painel pelo desktop para revisar dados, ajustar permissões e operar o caixa com mais contexto visível.
          </div>
        </aside>

        <div className="min-w-0">
          <nav className="sticky top-0 z-40 hidden border-b bg-background/95 px-6 py-3 backdrop-blur lg:block">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Administração do restaurante</p>
                <p className="text-xs text-muted-foreground">Interface otimizada para uso em computador.</p>
              </div>
              <ProfileMenu className="shrink-0" currentAccess="admin" />
            </div>
          </nav>

          <main className="min-w-0 px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
            <div className="rounded-[calc(var(--radius)+4px)] border bg-card p-4 sm:p-6 lg:p-7">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
