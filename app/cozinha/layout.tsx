// app/(cozinha)/layout.tsx
import { LogoutButton } from '@/components/auth/logout-button'
import { requireAccess } from '@/lib/auth/access'

export default async function CozinhaLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('cozinha')

  return (
    <div className="min-h-screen bg-background font-sans">
      <LogoutButton />
      {children}
    </div>
  )
}
