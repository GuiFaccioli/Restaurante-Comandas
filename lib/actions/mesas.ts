'use server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { mesa } from '@/lib/db/schema'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

async function requireAuth() {
  const { data: session } = await auth.getSession()
  if (!session?.user) redirect('/auth/sign-in')
  return session.user
}

export async function criarMesa(numero: number): Promise<{ id: string }> {
  await requireAuth()
  const [m] = await db
    .insert(mesa)
    .values({ numero })
    .returning({ id: mesa.id })
  return { id: m.id }
}

export async function toggleAtiva(id: string): Promise<void> {
  await requireAuth()
  const [m] = await db
    .select({ ativa: mesa.ativa })
    .from(mesa)
    .where(eq(mesa.id, id))

  await db.update(mesa).set({ ativa: !m.ativa }).where(eq(mesa.id, id))
}
