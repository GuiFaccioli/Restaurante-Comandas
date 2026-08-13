import Link from 'next/link'

import { Button, buttonVariants } from '@/components/ui/button'
import { signOut } from '@/lib/actions/auth'
import { ACCESS_DENIED_MESSAGE } from '@/lib/auth/access'
import type { AcessoUsuario } from '@/lib/db/schema'

export default async function SemAcessoPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams
  const message = area && area in ACCESS_DENIED_MESSAGE
    ? ACCESS_DENIED_MESSAGE[area as AcessoUsuario]
    : 'Seu usuário não tem permissão para acessar esta área.'

  return (
    <main className="flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-4 rounded-[var(--radius)] border bg-card p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Sem acesso</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            {message}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/selecionar-area"
            className={buttonVariants({ intent: 'neutral', appearance: 'outline', className: 'min-h-11 w-full sm:w-auto' })}
          >
            Trocar área
          </Link>
          <form action={signOut}>
            <Button type="submit" intent="neutral" appearance="outline" className="min-h-11 w-full sm:w-auto">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
