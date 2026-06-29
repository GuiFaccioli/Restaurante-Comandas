import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/index'
import { usuarioAcesso } from '@/lib/db/schema'
import type { AcessoUsuario } from '@/lib/db/schema'
import { getCurrentSession } from '@/lib/auth/session'

const ACCESS_DESTINATION: Record<AcessoUsuario, string> = {
  admin: '/admin/menu',
  caixa: '/admin/pedidos',
  cozinha: '/cozinha/dashboard',
  garcom: '/garcom/mesas',
}

export async function getCurrentAccesses(): Promise<AcessoUsuario[]> {
  const session = await getCurrentSession()
  if (!session) return []

  const rows = await db
    .select({ acesso: usuarioAcesso.acesso })
    .from(usuarioAcesso)
    .where(eq(usuarioAcesso.usuarioId, session.usuarioId))

  return rows.map((row) => row.acesso)
}

export function redirectForAccesses(accesses: AcessoUsuario[]): string {
  if (accesses.length === 0) return '/sem-acesso'
  if (accesses.length > 1) return '/selecionar-area'
  return ACCESS_DESTINATION[accesses[0]]
}

export async function requireAccess(
  access: AcessoUsuario
): Promise<{ usuarioId: string; access: AcessoUsuario }> {
  const session = await getCurrentSession()
  if (!session) redirect('/auth/sign-in')

  const accesses = await getCurrentAccesses()
  if (!accesses.includes(access)) redirect('/sem-acesso')

  return { usuarioId: session.usuarioId, access }
}
