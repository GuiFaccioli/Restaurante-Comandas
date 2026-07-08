// app/(cozinha)/layout.tsx
import { ProfileMenu } from '@/components/auth/profile-menu'
import { requireAccess } from '@/lib/auth/access'

export default async function CozinhaLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('cozinha')

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="flex items-center justify-end gap-3 px-4 pt-4">
        <ProfileMenu currentAccess="cozinha" />
      </div>
      {children}
    </div>
  )
}
