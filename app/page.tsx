import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db/index'
import { eq } from 'drizzle-orm'
import { usuario } from '@/lib/db/schema'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { data: session } = await auth.getSession()
  if (!session?.user) redirect('/auth/sign-in')

  const [u] = await db
    .select({ role: usuario.role })
    .from(usuario)
    .where(eq(usuario.id, session.user.id))

  if (u?.role === 'admin') redirect('/menu')
  redirect('/garcom/pedidos')
}
