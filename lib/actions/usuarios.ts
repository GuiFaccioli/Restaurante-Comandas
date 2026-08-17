'use server'

import { and, eq, gt, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createHash, randomBytes } from 'node:crypto'

import { requireAccess } from '@/lib/auth/access'
import { db, runInDbTransaction } from '@/lib/db/index'
import { tenant, tenantUser, usuario, usuarioAcesso, usuarioConvite } from '@/lib/db/schema'
import type { AcessoUsuario } from '@/lib/db/schema'
import { assertValidEmail } from '@/lib/auth/password'
import { createAuthSession } from '@/lib/auth/session'
import { getNeonAuth, isNeonAuthEnabled } from '@/lib/auth/server'
import { redirectForAccesses } from '@/lib/auth/access'

const VALID_ACCESSES: AcessoUsuario[] = ['admin', 'caixa', 'cozinha', 'garcom']
const CREATE_USER_ERROR_MESSAGE = 'Não foi possível cadastrar o usuário'
const USER_INVITE_TTL_MS = 24 * 60 * 60 * 1000

function inviteTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3009').replace(/\/$/, '')
}

function removedUserEmail(usuarioId: string) {
  return `removed-${usuarioId}@invalid.local`
}

function formString(data: FormData, key: string) {
  return String(data.get(key) ?? '')
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505')
}

export async function getConviteUsuarioEmail(token: string): Promise<string | null> {
  if (!token) return null

  const [invite] = await db
    .select({ email: usuarioConvite.email, expiraEm: usuarioConvite.expiraEm, aceitoEm: usuarioConvite.aceitoEm })
    .from(usuarioConvite)
    .where(eq(usuarioConvite.tokenHash, inviteTokenHash(token)))

  if (!invite || invite.aceitoEm || invite.expiraEm <= new Date()) return null
  return invite.email
}

export async function cadastrarUsuarioAdmin(data: FormData): Promise<{ inviteUrl: string; expiresAt: string }> {
  const { tenantId, usuarioId: criadoPorUsuarioId } = await requireAccess('admin')
  const nome = formString(data, 'nome').trim()
  const email = assertValidEmail(formString(data, 'email'))
  const rawAcessos = data.getAll('acessos').map(String)
  const acessos = [...new Set(rawAcessos)]

  if (!nome || nome.length > 120) throw new Error('Informe um nome válido')
  if (acessos.length === 0 || acessos.some((access) => !VALID_ACCESSES.includes(access as AcessoUsuario))) {
    throw new Error('Selecione pelo menos uma permissão válida')
  }

  const usuarioId = crypto.randomUUID()
  const tenantUserId = crypto.randomUUID()
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + USER_INVITE_TTL_MS)
  const now = new Date()

  try {
    await runInDbTransaction({
      postgresOperation: async (tx) => {
        const [existing] = await tx
          .select({ id: usuario.id })
          .from(usuario)
          .where(eq(usuario.email, email))

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

          if (activeMembership) throw new Error('Este e-mail já está cadastrado neste restaurante')

          const [otherMembership] = await tx
            .select({ id: tenantUser.id })
            .from(tenantUser)
            .where(eq(tenantUser.usuarioId, existing.id))

          if (otherMembership) {
            throw new Error('Este e-mail já possui uma conta. Use o acesso existente ou outro e-mail.')
          }

          await tx
            .update(usuario)
            .set({
              email: removedUserEmail(existing.id),
              authUserId: null,
              passwordHash: null,
              updatedAt: now,
            })
            .where(eq(usuario.id, existing.id))

          await tx.insert(usuario).values({
            id: usuarioId,
            nome,
            email,
            passwordHash: null,
            role: 'garcom',
            createdAt: now,
            updatedAt: now,
          })
        } else {
          await tx.insert(usuario).values({
            id: usuarioId,
            nome,
            email,
            passwordHash: null,
            role: 'garcom',
            createdAt: now,
            updatedAt: now,
          })
        }

        await tx.insert(tenantUser).values({
          id: tenantUserId,
          tenantId,
          usuarioId,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
        await tx.insert(usuarioAcesso).values(
          acessos.map((acesso) => ({
            id: crypto.randomUUID(),
            tenantUserId,
            usuarioId,
            acesso: acesso as AcessoUsuario,
          }))
        )
        await tx.insert(usuarioConvite).values({
          id: crypto.randomUUID(),
          tenantId,
          tenantUserId,
          usuarioId,
          criadoPorUsuarioId,
          email,
          tokenHash: inviteTokenHash(token),
          expiraEm: expiresAt,
          aceitoEm: null,
          criadoEm: now,
        })
      },
    })
  } catch (error) {
    if (isUniqueConstraintError(error) || (error instanceof Error && error.message === CREATE_USER_ERROR_MESSAGE)) {
      throw new Error(CREATE_USER_ERROR_MESSAGE)
    }
    throw error
  }

  revalidatePath('/admin/usuarios')
  return { inviteUrl: `${appUrl()}/convite/${token}`, expiresAt: expiresAt.toISOString() }
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

export async function aceitarConviteUsuario(data: FormData): Promise<void> {
  const token = formString(data, 'token')
  const password = formString(data, 'password')
  const passwordConfirmation = formString(data, 'passwordConfirmation')
  if (!token) throw new Error('Convite inválido')
  if (password.length < 8) throw new Error('Senha deve ter pelo menos 8 caracteres')
  if (password !== passwordConfirmation) throw new Error('As senhas não coincidem')

  const now = new Date()
  const [invite] = await db
    .select({
      id: usuarioConvite.id,
      email: usuarioConvite.email,
      usuarioId: usuarioConvite.usuarioId,
      tenantId: usuarioConvite.tenantId,
      expiraEm: usuarioConvite.expiraEm,
      aceitoEm: usuarioConvite.aceitoEm,
    })
    .from(usuarioConvite)
    .where(eq(usuarioConvite.tokenHash, inviteTokenHash(token)))

  if (!invite || invite.aceitoEm || invite.expiraEm <= now) {
    throw new Error('Este convite expirou. Solicite um novo convite ao administrador.')
  }

  let authUserId: string | null = null
  if (isNeonAuthEnabled()) {
    const result = await (await getNeonAuth()).signUp.email({
      email: invite.email,
      password,
      name: invite.email,
    })
    authUserId = result.data?.user?.id ?? null
    if (result.error || !authUserId) throw new Error('Não foi possível ativar este convite. Verifique os dados e tente novamente.')
  }

  await db
    .update(usuario)
    .set({
      authUserId,
      passwordHash: isNeonAuthEnabled() ? null : await import('@/lib/auth/password').then(({ hashPassword }) => hashPassword(password)),
      updatedAt: now,
    })
    .where(eq(usuario.id, invite.usuarioId))

  const [updated] = await db
    .update(usuarioConvite)
    .set({ aceitoEm: now })
    .where(and(eq(usuarioConvite.id, invite.id), isNull(usuarioConvite.aceitoEm), gt(usuarioConvite.expiraEm, now)))
    .returning({ id: usuarioConvite.id })
  if (!updated) throw new Error('Este convite já foi utilizado ou expirou.')

  const accesses = await db
    .select({ acesso: usuarioAcesso.acesso })
    .from(usuarioAcesso)
    .where(eq(usuarioAcesso.usuarioId, invite.usuarioId))

  await createAuthSession(invite.usuarioId, invite.tenantId)
  redirect(redirectForAccesses(accesses.map((row) => row.acesso)))
}

export async function removerUsuarioDoRestaurante(data: FormData): Promise<void> {
  const { usuarioId: currentUserId, tenantId } = await requireAccess('admin')
  const usuarioId = formString(data, 'usuarioId')
  const confirmEmail = formString(data, 'confirmEmail').trim().toLowerCase()

  if (!usuarioId) throw new Error('Usuário inválido')
  if (usuarioId === currentUserId) throw new Error('Você não pode remover seu próprio usuário')

  const [targetUser] = await db
    .select({ email: usuario.email, ownerUserId: tenant.ownerUserId })
    .from(tenantUser)
    .innerJoin(usuario, eq(tenantUser.usuarioId, usuario.id))
    .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
    .where(and(eq(tenantUser.usuarioId, usuarioId), eq(tenantUser.tenantId, tenantId)))

  if (!targetUser) throw new Error('Usuário não encontrado neste restaurante')
  if (targetUser.ownerUserId === usuarioId) {
    throw new Error('O administrador que criou a conta não pode ser removido')
  }
  if (confirmEmail !== targetUser.email.trim().toLowerCase()) {
    throw new Error('Digite o e-mail do usuário para confirmar a remoção')
  }

  await runInDbTransaction({
    postgresOperation: async (tx) => {
      await tx
        .delete(tenantUser)
        .where(and(eq(tenantUser.usuarioId, usuarioId), eq(tenantUser.tenantId, tenantId)))

      const remainingMemberships = await tx
        .select({ id: tenantUser.id })
        .from(tenantUser)
        .where(eq(tenantUser.usuarioId, usuarioId))

      if (remainingMemberships.length === 0) {
        await tx
          .update(usuario)
          .set({
            email: removedUserEmail(usuarioId),
            authUserId: null,
            passwordHash: null,
            updatedAt: new Date(),
          })
          .where(eq(usuario.id, usuarioId))
      }
    },
  })

  revalidatePath('/admin/usuarios')
}
