import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/auth/logout-button'
import { listCurrentTenantMemberships, selectTenant } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function SelecionarEmpresaPage() {
  const memberships = await listCurrentTenantMemberships()

  if (memberships.length === 0) redirect('/sem-acesso')
  if (memberships.length === 1) {
    const formData = new FormData()
    formData.set('tenantId', memberships[0].tenantId)
    await selectTenant(formData)
  }

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <LogoutButton />
      <div className="w-full max-w-lg space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Selecionar empresa</h1>
          <p className="text-sm text-muted-foreground">
            Escolha qual restaurante você quer acessar agora.
          </p>
        </div>
        <div className="grid gap-3">
          {memberships.map((membership) => (
            <form key={membership.tenantId} action={selectTenant}>
              <input type="hidden" name="tenantId" value={membership.tenantId} />
              <Button type="submit" variant="outline" className="w-full h-auto justify-start p-4">
                {membership.nome}
              </Button>
            </form>
          ))}
        </div>
      </div>
    </main>
  )
}
