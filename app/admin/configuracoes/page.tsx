import { requireAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

const settings = [
  {
    title: 'Cardápio',
    description: 'Gerencie categorias, produtos, preços, imagens e disponibilidade.',
    href: '/admin/menu',
  },
  {
    title: 'Mesas',
    description: 'Controle quais mesas existem e se estão ativas para atendimento.',
    href: '/admin/mesas',
  },
  {
    title: 'Pedidos e caixa',
    description: 'Acompanhe pedidos persistidos e use os valores para cobrança externa.',
    href: '/admin/pedidos',
  },
  {
    title: 'Usuários cadastrados',
    description: 'Audite os usuários existentes e os acessos operacionais configurados.',
    href: '/admin/usuarios',
  },
]

export default async function ConfiguracoesAdminPage() {
  await requireAccess('admin')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Central de atalhos para configurar e revisar a operação do restaurante.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {settings.map((setting) => (
          <a
            key={setting.href}
            href={setting.href}
            className="rounded-[var(--radius)] border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <h2 className="font-semibold">{setting.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{setting.description}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
