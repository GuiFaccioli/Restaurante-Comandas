import { signOut } from '@/lib/actions/auth'
import {
  ACCESS_DESTINATION,
  ACCESS_LABEL,
  getCurrentAccesses,
} from '@/lib/auth/access'
import { getCurrentSession } from '@/lib/auth/session'
import { ProfileMenuClient } from '@/components/auth/profile-menu-client'
import { Button } from '@/components/ui/button'
import type { AcessoUsuario } from '@/lib/db/schema'

type ProfileMenuProps = {
  className?: string
  currentAccess?: AcessoUsuario
}

export async function ProfileMenu({ className, currentAccess }: ProfileMenuProps) {
  const session = await getCurrentSession()
  const accesses = await getCurrentAccesses()
  const showAccessSwitcher = accesses.length > 1

  return (
    <ProfileMenuClient className={className}>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{session?.nome ?? 'Usuário'}</p>
        {session?.email && (
          <p className="break-all text-xs text-muted-foreground">{session.email}</p>
        )}
      </div>

      {showAccessSwitcher && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Acessos
          </p>
          <div className="space-y-1">
            {accesses.map((access) =>
              access === currentAccess ? (
                <div
                  key={access}
                  className="flex items-center justify-between rounded-[var(--radius)] bg-muted px-3 py-2 text-sm font-medium"
                >
                  <span>{ACCESS_LABEL[access]}</span>
                  <span className="text-xs text-muted-foreground">Atual</span>
                </div>
              ) : (
                <a
                  key={access}
                  href={ACCESS_DESTINATION[access]}
                  className="block rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {ACCESS_LABEL[access]}
                </a>
              )
            )}
          </div>
        </div>
      )}

      <form action={signOut} className="mt-4">
        <Button type="submit" variant="destructive" size="sm" className="w-full">
          Sair
        </Button>
      </form>
    </ProfileMenuClient>
  )
}
