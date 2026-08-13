import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/index'
import { tenant, tenantUser, usuarioAcesso } from '@/lib/db/schema'
import type { AcessoUsuario } from '@/lib/db/schema'
import { getCurrentSession } from '@/lib/auth/session'

export const ACCESS_LABEL: Record<AcessoUsuario, string> = {
  admin: 'Administração',
  caixa: 'Caixa',
  cozinha: 'Cozinha',
  garcom: 'Garçom',
}

export const ACCESS_DESCRIPTION: Record<AcessoUsuario, string> = {
  admin: 'Gerenciar cardápio, mesas e configuração.',
  caixa: 'Fechar comandas e registrar pagamentos externos.',
  cozinha: 'Acompanhar e atualizar preparo dos pedidos.',
  garcom: 'Selecionar mesas e confirmar pedidos.',
}

export const ACCESS_DESTINATION: Record<AcessoUsuario, string> = {
  admin: '/admin/menu',
  caixa: '/admin/pedidos',
  cozinha: '/cozinha/dashboard',
  garcom: '/garcom/pedidos',
}

export const ACCESS_DENIED_MESSAGE: Record<AcessoUsuario, string> = {
  admin: 'Você não tem permissão para acessar a administração do restaurante.',
  caixa: 'Você não tem permissão para acessar o caixa e os pagamentos.',
  cozinha: 'Você não tem permissão para acessar o painel da cozinha.',
  garcom: 'Você não tem permissão para acessar mesas e pedidos.',
}

async function getAccessesForIdentityAndTenant(
  usuarioId: string,
  tenantId: string
): Promise<AcessoUsuario[]> {
  const rows = await db
    .select({ acesso: usuarioAcesso.acesso })
    .from(usuarioAcesso)
    .innerJoin(tenantUser, eq(usuarioAcesso.tenantUserId, tenantUser.id))
    .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
    .where(
      and(
        eq(usuarioAcesso.usuarioId, usuarioId),
        eq(tenantUser.usuarioId, usuarioId),
        eq(tenantUser.tenantId, tenantId),
        eq(tenantUser.status, 'active'),
        eq(tenant.status, 'active')
      )
    )

  return rows.map((row) => row.acesso)
}

export async function getCurrentAccesses(): Promise<AcessoUsuario[]> {
  const session = await getCurrentSession()
  if (!session) return []
  if (!session.selectedTenantId) return []

  return getAccessesForIdentityAndTenant(session.usuarioId, session.selectedTenantId)
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

  const accesses = await getAccessesForIdentityAndTenant(
    session.usuarioId,
    session.selectedTenantId
  )
  const matchedAccess = allowedAccesses.find((access) => accesses.includes(access))
  if (!matchedAccess) redirect(`/sem-acesso?area=${allowedAccesses[0] ?? 'admin'}`)

  return { usuarioId: session.usuarioId, tenantId: session.selectedTenantId, access: matchedAccess }
}
