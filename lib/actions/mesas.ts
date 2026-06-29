'use server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { mesa } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'

export async function criarMesa(numero: number): Promise<{ id: string }> {
  await requireAccess('admin')
  const [m] = await db
    .insert(mesa)
    .values({ numero })
    .returning({ id: mesa.id })
  return { id: m.id }
}

export async function toggleAtiva(id: string): Promise<void> {
  await requireAccess('admin')
  const [m] = await db
    .select({ ativa: mesa.ativa })
    .from(mesa)
    .where(eq(mesa.id, id))

  await db.update(mesa).set({ ativa: !m.ativa }).where(eq(mesa.id, id))
}
