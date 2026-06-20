// app/(garcom)/layout.tsx
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = await auth.getSession()
  if (!session?.user) redirect('/auth/sign-in')
  return <div className="min-h-screen bg-background">{children}</div>
}
