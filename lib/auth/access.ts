import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/index'
import { tenantUser, usuarioAcesso } from '@/lib/db/schema'
import type { AcessoUsuario } from '@/lib/db/schema'
import { getCurrentSession } from '@/lib/auth/session'

const ACCESS_DESTINATION: Record<AcessoUsuario, string> = {
  admin: '/admin/menu',
  caixa: '/admin/pedidos',
  cozinha: '/cozinha/dashboard',
  garcom: '/garcom/pedidos',
}

export async function getCurrentAccesses(): Promise<AcessoUsuario[]> {
  const session = await getCurrentSession()
  if (!session) return []
  if (!session.selectedTenantId) return []

  const rows = await db
    .select({ acesso: usuarioAcesso.acesso })
    .from(usuarioAcesso)
    .innerJoin(tenantUser, eq(usuarioAcesso.tenantUserId, tenantUser.id))
    .where(
      and(
        eq(usuarioAcesso.usuarioId, session.usuarioId),
        eq(tenantUser.tenantId, session.selectedTenantId)
      )
    )

  return rows.map((row) => row.acesso)
}

export function redirectForAccesses(accesses: AcessoUsuario[]): string {
  if (accesses.length === 0) return '/sem-acesso'
  if (accesses.length > 1) return '/selecionar-area'
  return ACCESS_DESTINATION[accesses[0]]
}

export async function requireAccess(
  access: AcessoUsuario
): Promise<{ usuarioId: string; tenantId: string; access: AcessoUsuario }> {
  return requireAnyAccess([access])
}

export async function requireAnyAccess(
  allowedAccesses: readonly AcessoUsuario[]
): Promise<{ usuarioId: string; tenantId: string; access: AcessoUsuario }> {
  const session = await getCurrentSession()
  if (!session) redirect('/auth/sign-in')
  if (!session.selectedTenantId) redirect('/selecionar-empresa')

  const accesses = await getCurrentAccesses()
  const matchedAccess = allowedAccesses.find((access) => accesses.includes(access))
  if (!matchedAccess) redirect('/sem-acesso')

  return { usuarioId: session.usuarioId, tenantId: session.selectedTenantId, access: matchedAccess }
}
