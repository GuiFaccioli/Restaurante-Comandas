import { ProfileMenu } from '@/components/auth/profile-menu'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const primaryLinks = [
    { href: '/admin/menu', label: 'Cardápio' },
    { href: '/admin/mesas', label: 'Mesas' },
    { href: '/admin/pedidos', label: 'Pedidos' },
  ]
  const managementLinks = [
    { href: '/admin/relatorios', label: 'Relatórios', description: 'Indicadores e ideias de análise' },
    { href: '/admin/usuarios', label: 'Usuários cadastrados', description: 'Acessos e perfis do sistema' },
    { href: '/admin/configuracoes', label: 'Configurações', description: 'Operação e parâmetros gerais' },
  ]

  return (
    <div className="min-h-screen bg-muted/40">
      <nav className="sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Painel admin</p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Configure a operação sem sair do fluxo.
            </p>
          </div>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {primaryLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border bg-card px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {link.label}
              </a>
            ))}
          </div>
          <ProfileMenu className="shrink-0" currentAccess="admin" />
        </div>
      </nav>
      <div className="mx-auto grid min-h-[calc(100dvh-73px)] max-w-7xl grid-cols-1 gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[var(--radius)] border bg-card p-4 lg:sticky lg:top-24 lg:h-fit">
          <h2 className="text-sm font-semibold">Gestão</h2>
          <p className="mt-1 text-pretty text-xs text-muted-foreground">
            Atalhos administrativos para controlar a operação.
          </p>
          <div className="mt-4 grid gap-2">
            {managementLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block rounded-[var(--radius)] border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="font-medium">{link.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{link.description}</span>
              </a>
            ))}
          </div>
        </aside>
        <main className="min-w-0 rounded-[var(--radius)] border bg-card p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
