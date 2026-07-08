import { redirect } from 'next/navigation'
import { ProfileMenu } from '@/components/auth/profile-menu'
import {
  ACCESS_DESCRIPTION,
  ACCESS_LABEL,
  getCurrentAccesses,
  redirectForAccesses,
} from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function SelecionarAreaPage() {
  const accesses = await getCurrentAccesses()

  if (accesses.length !== 1 && accesses.length === 0) redirect('/sem-acesso')
  if (accesses.length === 1) redirect(redirectForAccesses(accesses))

  return (
    <main className="relative min-h-screen p-6 flex items-center justify-center">
      <ProfileMenu className="absolute right-4 top-4" />
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
              <p className="font-medium">{ACCESS_LABEL[access]}</p>
              <p className="text-sm text-muted-foreground">{ACCESS_DESCRIPTION[access]}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
