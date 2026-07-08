import Link from 'next/link'

import { Button, buttonVariants } from '@/components/ui/button'
import { signOut } from '@/lib/actions/auth'

export default function SemAcessoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-[12px] p-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Sem acesso</h1>
          <p className="text-sm text-muted-foreground">
            Seu usuário não tem permissão para acessar esta área.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/selecionar-area"
            className={buttonVariants({ variant: 'outline' })}
          >
            Trocar área
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="destructive">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
