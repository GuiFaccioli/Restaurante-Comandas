import { redirect } from 'next/navigation'
import { ProfileMenu } from '@/components/auth/profile-menu'
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
    <main className="relative flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <ProfileMenu className="absolute right-4 top-4" />
      <div className="w-full max-w-lg space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Selecionar empresa</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Escolha qual restaurante você quer acessar agora.
          </p>
        </div>
        <div className="grid gap-3">
          {memberships.map((membership) => (
            <form key={membership.tenantId} action={selectTenant}>
              <input type="hidden" name="tenantId" value={membership.tenantId} />
              <Button
                type="submit"
                variant="outline"
                className="h-auto min-h-11 w-full justify-start p-4 text-left focus-visible:ring-2"
              >
                {membership.nome}
              </Button>
            </form>
          ))}
        </div>
      </div>
    </main>
  )
}
