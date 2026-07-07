import { LogoutButton } from '@/components/auth/logout-button'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const managementLinks = [
    { href: '/admin/relatorios', label: 'Relatórios', description: 'Indicadores e ideias de análise' },
    { href: '/admin/usuarios', label: 'Usuários cadastrados', description: 'Acessos e perfis do sistema' },
    { href: '/admin/configuracoes', label: 'Configurações', description: 'Operação e parâmetros gerais' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <LogoutButton />
      <nav className="border-b px-6 py-3 flex gap-6">
        <a href="/admin/menu" className="text-sm font-medium hover:text-primary">Cardápio</a>
        <a href="/admin/mesas" className="text-sm font-medium hover:text-primary">Mesas</a>
        <a href="/admin/pedidos" className="text-sm font-medium hover:text-primary">Pedidos</a>
      </nav>
      <div className="grid min-h-[calc(100vh-49px)] grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main>{children}</main>
        <aside className="rounded-[var(--radius)] border bg-card p-4 lg:sticky lg:top-6 lg:h-fit">
          <h2 className="text-sm font-semibold">Gestão</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Atalhos administrativos para controlar a operação.
          </p>
          <div className="mt-4 space-y-2">
            {managementLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block rounded-[var(--radius)] border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{link.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{link.description}</span>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
