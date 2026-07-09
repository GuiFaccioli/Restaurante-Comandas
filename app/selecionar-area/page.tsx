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
    <main className="relative flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <ProfileMenu className="absolute right-4 top-4" />
      <div className="w-full max-w-lg space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Selecionar área</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Escolha em qual área você quer entrar agora.
          </p>
        </div>
        <div className="grid gap-3">
          {accesses.map((access) => (
            <a
              key={access}
              href={redirectForAccesses([access])}
              className="rounded-[var(--radius)] border bg-card p-4 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
