'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access'
import { db } from '@/lib/db/index'
import { tenantUser, usuario, usuarioAcesso } from '@/lib/db/schema'
import type { AcessoUsuario, RoleUsuario } from '@/lib/db/schema'

const VALID_ROLES: RoleUsuario[] = ['admin', 'garcom']
const VALID_ACCESSES: AcessoUsuario[] = ['admin', 'caixa', 'cozinha', 'garcom']

function formString(data: FormData, key: string) {
  return String(data.get(key) ?? '')
}

export async function atualizarUsuarioAdmin(data: FormData): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const usuarioId = formString(data, 'usuarioId')
  const role = formString(data, 'role') as RoleUsuario
  const acessos = data
    .getAll('acessos')
    .map(String)
    .filter((access): access is AcessoUsuario =>
      VALID_ACCESSES.includes(access as AcessoUsuario)
    )

  if (!usuarioId) throw new Error('Usuário inválido')
  if (!VALID_ROLES.includes(role)) throw new Error('Cargo inválido')

  const [membership] = await db
    .select({ id: tenantUser.id })
    .from(tenantUser)
    .where(and(eq(tenantUser.usuarioId, usuarioId), eq(tenantUser.tenantId, tenantId)))

  if (!membership) throw new Error('Usuário não pertence a este restaurante')

  await db
    .update(usuario)
    .set({ role, updatedAt: new Date() })
    .where(eq(usuario.id, usuarioId))

  await db
    .delete(usuarioAcesso)
    .where(eq(usuarioAcesso.tenantUserId, membership.id))

  if (acessos.length > 0) {
    await db.insert(usuarioAcesso).values(
      acessos.map((acesso) => ({
        id: crypto.randomUUID(),
        tenantUserId: membership.id,
        usuarioId,
        acesso,
      }))
    )
  }

  revalidatePath('/admin/usuarios')
}

export async function removerUsuarioDoRestaurante(data: FormData): Promise<void> {
  const { usuarioId: currentUserId, tenantId } = await requireAccess('admin')
  const usuarioId = formString(data, 'usuarioId')

  if (!usuarioId) throw new Error('Usuário inválido')
  if (usuarioId === currentUserId) throw new Error('Você não pode remover seu próprio usuário')

  await db
    .delete(tenantUser)
    .where(and(eq(tenantUser.usuarioId, usuarioId), eq(tenantUser.tenantId, tenantId)))

  revalidatePath('/admin/usuarios')
}
