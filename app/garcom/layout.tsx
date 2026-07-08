// app/(garcom)/layout.tsx
import { ProfileMenu } from '@/components/auth/profile-menu'
import { requireAccess } from '@/lib/auth/access'

export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('garcom')
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-end gap-3 px-4 pt-4">
        <a href="/selecionar-area" className="text-sm font-medium hover:text-primary">
          Trocar área
        </a>
        <ProfileMenu />
      </div>
      {children}
    </div>
  )
}
