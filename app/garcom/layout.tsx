// app/(garcom)/layout.tsx
import { ProfileMenu } from '@/components/auth/profile-menu'
import { requireAccess } from '@/lib/auth/access'

export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('garcom')
  return (
    <div className="min-h-screen bg-background">
      <div className="flex justify-end px-4 pt-4">
        <ProfileMenu />
      </div>
      {children}
    </div>
  )
}
