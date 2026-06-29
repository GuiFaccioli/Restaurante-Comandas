// app/(garcom)/layout.tsx
import { requireAccess } from '@/lib/auth/access'

export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('garcom')
  return <div className="min-h-screen bg-background">{children}</div>
}
