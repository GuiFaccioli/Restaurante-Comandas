import { redirect } from 'next/navigation'
import { getCurrentAccesses, redirectForAccesses } from '@/lib/auth/access'
import type { AcessoUsuario } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

const AREA_LABEL: Record<AcessoUsuario, string> = {
  admin: 'Administração',
  caixa: 'Caixa',
  cozinha: 'Cozinha',
  garcom: 'Garçom',
}

const AREA_DESCRIPTION: Record<AcessoUsuario, string> = {
  admin: 'Gerenciar cardápio, mesas e configuração.',
  caixa: 'Fechar comandas e registrar pagamentos externos.',
  cozinha: 'Acompanhar e atualizar preparo dos pedidos.',
  garcom: 'Selecionar mesas e confirmar pedidos.',
}

export default async function SelecionarAreaPage() {
  const accesses = await getCurrentAccesses()

  if (accesses.length !== 1 && accesses.length === 0) redirect('/sem-acesso')
  if (accesses.length === 1) redirect(redirectForAccesses(accesses))

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Selecionar área</h1>
          <p className="text-sm text-muted-foreground">
            Escolha em qual área você quer entrar agora.
          </p>
        </div>
        <div className="grid gap-3">
          {accesses.map((access) => (
            <a
              key={access}
              href={redirectForAccesses([access])}
              className="border rounded-[12px] p-4 hover:bg-muted transition-colors"
            >
              <p className="font-medium">{AREA_LABEL[access]}</p>
              <p className="text-sm text-muted-foreground">{AREA_DESCRIPTION[access]}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
