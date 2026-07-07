import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  return (
    <form action={signOut} className="fixed top-4 right-4 z-50">
      <Button type="submit" variant="destructive" size="sm">
        Sair
      </Button>
    </form>
  )
}
