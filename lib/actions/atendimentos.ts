'use server'

import { and, eq } from 'drizzle-orm'

import { atendimento, mesa } from '@/lib/db/schema'
import type { StatusAtendimento } from '@/lib/db/schema'
import { db, runInDbTransaction } from '@/lib/db/index'
import { requireAccess } from '@/lib/auth/access'
import type { PostgresStockTransaction } from '@/lib/stock/service'

function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current = error
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== 'object' || current === null) return false
    const candidate = current as { cause?: unknown; code?: unknown; constraint?: unknown }
    if (candidate.code === '23505' && candidate.constraint === constraint) return true
    current = candidate.cause
  }
  return false
}

async function getOpenAttendance(tenantId: string, mesaId: string) {
  const [current] = await db
    .select({ id: atendimento.id })
    .from(atendimento)
    .where(and(
      eq(atendimento.tenantId, tenantId),
      eq(atendimento.mesaId, mesaId),
      eq(atendimento.status, 'open'),
    ))
  return current?.id ?? null
}

async function validateTable(tx: PostgresStockTransaction, tenantId: string, mesaId: string) {
  const [table] = await tx
    .select({ id: mesa.id })
    .from(mesa)
    .where(and(eq(mesa.id, mesaId), eq(mesa.tenantId, tenantId), eq(mesa.ativa, true)))
    .for('update')
  if (!table) throw new Error('Mesa inválida')
}

export async function iniciarAtendimento(mesaId: string): Promise<{ id: string }> {
  const { tenantId, usuarioId } = await requireAccess('garcom')
  if (!mesaId) throw new Error('Mesa inválida')
  try {
    return await runInDbTransaction({
      postgresOperation: async (tx) => {
        await validateTable(tx, tenantId, mesaId)
        const [current] = await tx
          .select({ id: atendimento.id })
          .from(atendimento)
          .where(and(eq(atendimento.tenantId, tenantId), eq(atendimento.mesaId, mesaId), eq(atendimento.status, 'open')))
          .for('update')
        if (current) return current
        const id = crypto.randomUUID()
        await tx.insert(atendimento).values({ id, tenantId, mesaId, status: 'open', abertoPorUsuarioId: usuarioId })
        return { id }
      },
    })
  } catch (error) {
    if (isUniqueViolation(error, 'atendimento_tenant_mesa_open_unique')) {
      const id = await getOpenAttendance(tenantId, mesaId)
      if (id) return { id }
    }
    throw error
  }
}

export async function continuarAtendimento(atendimentoId: string): Promise<{ id: string }> {
  const { tenantId, usuarioId } = await requireAccess('garcom')
  return runInDbTransaction({
    postgresOperation: async (tx) => {
      const [current] = await tx
        .select({ id: atendimento.id, mesaId: atendimento.mesaId, status: atendimento.status })
        .from(atendimento)
        .where(and(eq(atendimento.id, atendimentoId), eq(atendimento.tenantId, tenantId)))
        .for('update')
      if (!current) throw new Error('Conta não encontrada')
      if (current.status !== 'awaiting_payment') throw new Error('Esta conta não está aguardando pagamento')
      await validateTable(tx, tenantId, current.mesaId)
      const [open] = await tx
        .select({ id: atendimento.id })
        .from(atendimento)
        .where(and(eq(atendimento.tenantId, tenantId), eq(atendimento.mesaId, current.mesaId), eq(atendimento.status, 'open')))
        .for('update')
      if (open) throw new Error('Já existe um atendimento em andamento nesta mesa')
      await tx.update(atendimento).set({ status: 'open', aguardandoPagamentoEm: null, fechadoEm: null, fechadoPorUsuarioId: null, atualizadoEm: new Date() }).where(and(eq(atendimento.id, atendimentoId), eq(atendimento.tenantId, tenantId)))
      return { id: atendimentoId }
    },
  })
}

export async function iniciarNovoAtendimento(mesaId: string): Promise<{ id: string }> {
  return iniciarAtendimento(mesaId)
}

export async function atualizarStatusAtendimento(
  atendimentoId: string,
  status: Extract<StatusAtendimento, 'cancelled'>,
): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  await db.update(atendimento).set({ status, fechadoEm: new Date(), fechadoPorUsuarioId: usuarioId, atualizadoEm: new Date() }).where(and(eq(atendimento.id, atendimentoId), eq(atendimento.tenantId, tenantId)))
}
