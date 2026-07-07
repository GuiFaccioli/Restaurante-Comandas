// app/(garcom)/layout.tsx
import { LogoutButton } from '@/components/auth/logout-button'
import { requireAccess } from '@/lib/auth/access'

export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('garcom')
  return (
    <div className="min-h-screen bg-background">
      <LogoutButton />
      {children}
    </div>
  )
}
