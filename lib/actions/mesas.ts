'use server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { mesa } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'
import { dbBoolean } from '@/lib/db/compat'

export async function criarMesa(numero: number): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  const [m] = await db
    .insert(mesa)
    .values({ id: crypto.randomUUID(), tenantId, numero, ativa: dbBoolean(true) as boolean })
    .returning({ id: mesa.id })
  return { id: m.id }
}

export async function toggleAtiva(id: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const [m] = await db
    .select({ ativa: mesa.ativa })
    .from(mesa)
    .where(and(eq(mesa.id, id), eq(mesa.tenantId, tenantId)))

  await db
    .update(mesa)
    .set({ ativa: dbBoolean(!Boolean(m.ativa)) as boolean })
    .where(and(eq(mesa.id, id), eq(mesa.tenantId, tenantId)))
}
