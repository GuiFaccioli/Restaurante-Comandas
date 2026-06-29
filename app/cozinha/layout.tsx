// app/(cozinha)/layout.tsx
import { requireAccess } from '@/lib/auth/access'

export default async function CozinhaLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('cozinha')

  return (
    <div className="min-h-screen bg-background font-sans">
      {children}
    </div>
  )
}
