import { signOut } from '@/lib/actions/auth'
import { getCurrentSession } from '@/lib/auth/session'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ProfileMenuProps = {
  className?: string
}

export async function ProfileMenu({ className }: ProfileMenuProps) {
  const session = await getCurrentSession()

  return (
    <details className={cn('relative w-fit', className)}>
      <summary className="cursor-pointer list-none rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted">
        Perfil
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-64 rounded-[var(--radius)] border bg-card p-4 shadow-lg">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{session?.nome ?? 'Usuário'}</p>
          {session?.email && (
            <p className="break-all text-xs text-muted-foreground">{session.email}</p>
          )}
        </div>

        <form action={signOut} className="mt-4">
          <Button type="submit" variant="destructive" size="sm" className="w-full">
            Sair
          </Button>
        </form>
      </div>
    </details>
  )
}
