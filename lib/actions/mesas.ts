'use server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { mesa } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'

export async function criarMesa(numero: number): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  if (!Number.isInteger(numero) || numero <= 0) throw new Error('Informe um número de mesa inteiro maior que zero')
  let m: { id: string } | undefined
  try {
    ;[m] = await db
      .insert(mesa)
      .values({ id: crypto.randomUUID(), tenantId, numero, ativa: true })
      .returning({ id: mesa.id })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new Error(`A mesa ${numero} já está cadastrada`)
    }
    throw error
  }
  if (!m) throw new Error('Não foi possível criar a mesa')
  return { id: m.id }
}

export async function toggleAtiva(id: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const [updated] = await db
    .update(mesa)
    .set({ ativa: sql`NOT ${mesa.ativa}` })
    .where(and(eq(mesa.id, id), eq(mesa.tenantId, tenantId)))
    .returning({ id: mesa.id })

  if (!updated) {
    throw new Error('Mesa não encontrada')
  }
}
