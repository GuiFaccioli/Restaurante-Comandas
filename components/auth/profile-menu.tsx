import { signOut } from '@/lib/actions/auth'
import { getCurrentSession } from '@/lib/auth/session'
import { ProfileMenuClient } from '@/components/auth/profile-menu-client'
import { Button } from '@/components/ui/button'

type ProfileMenuProps = {
  className?: string
}

export async function ProfileMenu({ className }: ProfileMenuProps) {
  const session = await getCurrentSession()

  return (
    <ProfileMenuClient className={className}>
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
    </ProfileMenuClient>
  )
}
