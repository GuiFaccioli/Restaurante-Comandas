// app/(admin)/layout.tsx
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/index'
import { eq } from 'drizzle-orm'
import { usuario } from '@/lib/db/schema'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = await auth.getSession()
  if (!session?.user) redirect('/auth/sign-in')

  const [u] = await db
    .select({ role: usuario.role })
    .from(usuario)
    .where(eq(usuario.id, session.user.id))

  if (!u || u.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-3 flex gap-6">
        <a href="/admin/menu" className="text-sm font-medium hover:text-primary">Cardápio</a>
        <a href="/admin/mesas" className="text-sm font-medium hover:text-primary">Mesas</a>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
