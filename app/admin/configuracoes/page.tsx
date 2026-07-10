import { requireAccess } from '@/lib/auth/access'
import { AdminPage, AdminPageHeader, AdminPanel, AdminStatsGrid, AdminStatCard } from '@/components/admin/admin-page'

export const dynamic = 'force-dynamic'

const settings = [
  {
    title: 'Cardápio',
    description: 'Gerencie categorias, produtos, preços, imagens e disponibilidade.',
    href: '/admin/menu',
    group: 'Operação',
  },
  {
    title: 'Mesas',
    description: 'Controle quais mesas existem e se estão ativas para atendimento.',
    href: '/admin/mesas',
    group: 'Operação',
  },
  {
    title: 'Pedidos e caixa',
    description: 'Acompanhe pedidos persistidos e use os valores para cobrança externa.',
    href: '/admin/pedidos',
    group: 'Atendimento',
  },
  {
    title: 'Usuários cadastrados',
    description: 'Audite os usuários existentes e os acessos operacionais configurados.',
    href: '/admin/usuarios',
    group: 'Segurança',
  },
  {
    title: 'Relatórios',
    description: 'Leia indicadores de vendas, entrega, produtos e categorias.',
    href: '/admin/relatorios',
    group: 'Gestão',
  },
]

export default async function ConfiguracoesAdminPage() {
  await requireAccess('admin')

  return (
    <AdminPage>
      <AdminPageHeader
        title="Configurações"
        description="Central operacional para ajustar o restaurante sem procurar funções espalhadas pelo painel."
      />

      <AdminStatsGrid className="xl:grid-cols-3">
        <AdminStatCard label="Áreas configuráveis" value={settings.length} detail="Atalhos principais do admin." />
        <AdminStatCard label="Operação diária" value="3" detail="Cardápio, mesas, pedidos e caixa." />
        <AdminStatCard label="Controle interno" value="2" detail="Usuários e relatórios gerenciais." />
      </AdminStatsGrid>

      <AdminPanel
        title="Mapa do painel"
        description="Entre pela função que você quer resolver agora; cada bloco leva direto ao contexto certo."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {settings.map((setting) => (
            <a
              key={setting.href}
              href={setting.href}
              className="group rounded-[var(--radius)] border bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{setting.group}</p>
                  <h2 className="mt-1 font-semibold group-hover:underline">{setting.title}</h2>
                </div>
                <span aria-hidden="true" className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>
              <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">{setting.description}</p>
            </a>
          ))}
        </div>
      </AdminPanel>
    </AdminPage>
  )
}
