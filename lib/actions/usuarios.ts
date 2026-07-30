'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access'
import { db, runInDbTransaction } from '@/lib/db/index'
import { tenantUser, usuario, usuarioAcesso } from '@/lib/db/schema'
import type { AcessoUsuario } from '@/lib/db/schema'
import { assertValidEmail, hashPassword } from '@/lib/auth/password'

const VALID_ACCESSES: AcessoUsuario[] = ['admin', 'caixa', 'cozinha', 'garcom']
const CREATE_USER_ERROR_MESSAGE = 'Não foi possível cadastrar o usuário'

function formString(data: FormData, key: string) {
  return String(data.get(key) ?? '')
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505')
}

export async function cadastrarUsuarioAdmin(data: FormData): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const nome = formString(data, 'nome').trim()
  const email = assertValidEmail(formString(data, 'email'))
  const password = formString(data, 'password')
  const rawAcessos = data.getAll('acessos').map(String)
  const acessos = [...new Set(rawAcessos)]

  if (!nome || nome.length > 120) throw new Error('Informe um nome válido')
  if (acessos.length === 0 || acessos.some((access) => !VALID_ACCESSES.includes(access as AcessoUsuario))) {
    throw new Error('Selecione pelo menos uma permissão válida')
  }

  const usuarioId = crypto.randomUUID()
  const tenantUserId = crypto.randomUUID()
  const now = new Date()

  try {
    await runInDbTransaction({
      postgresOperation: async (tx) => {
        const [existing] = await tx
          .select({ id: usuario.id })
          .from(usuario)
          .where(eq(usuario.email, email))

        let targetUsuarioId = usuarioId
        if (existing) {
          const [activeMembership] = await tx
            .select({ id: tenantUser.id })
            .from(tenantUser)
            .where(
              and(
                eq(tenantUser.usuarioId, existing.id),
                eq(tenantUser.tenantId, tenantId),
                eq(tenantUser.status, 'active')
              )
            )

          if (activeMembership) throw new Error(CREATE_USER_ERROR_MESSAGE)
          targetUsuarioId = existing.id

          // The account is global: resetting the password here changes login credentials
          // for this user in every tenant where the account remains a member.
          await tx
            .update(usuario)
            .set({
              nome,
              passwordHash: await hashPassword(password),
              updatedAt: now,
            })
            .where(eq(usuario.id, existing.id))
        } else {
          await tx.insert(usuario).values({
            id: usuarioId,
            nome,
            email,
            passwordHash: await hashPassword(password),
            role: 'garcom',
            createdAt: now,
            updatedAt: now,
          })
        }

        await tx.insert(tenantUser).values({
          id: tenantUserId,
          tenantId,
          usuarioId: targetUsuarioId,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
        await tx.insert(usuarioAcesso).values(
          acessos.map((acesso) => ({
            id: crypto.randomUUID(),
            tenantUserId,
            usuarioId: targetUsuarioId,
            acesso: acesso as AcessoUsuario,
          }))
        )
      },
    })
  } catch (error) {
    if (isUniqueConstraintError(error) || (error instanceof Error && error.message === CREATE_USER_ERROR_MESSAGE)) {
      throw new Error(CREATE_USER_ERROR_MESSAGE)
    }
    throw error
  }

  revalidatePath('/admin/usuarios')
}

export async function atualizarUsuarioAdmin(data: FormData): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const usuarioId = formString(data, 'usuarioId')
  const acessos = data
    .getAll('acessos')
    .map(String)
    .filter((access): access is AcessoUsuario =>
      VALID_ACCESSES.includes(access as AcessoUsuario)
    )

  if (!usuarioId) throw new Error('Usuário inválido')

  const [membership] = await db
    .select({ id: tenantUser.id })
    .from(tenantUser)
    .where(and(eq(tenantUser.usuarioId, usuarioId), eq(tenantUser.tenantId, tenantId)))

  if (!membership) throw new Error('Usuário não pertence a este restaurante')

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
