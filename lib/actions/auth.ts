'use server'

import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db, runInDbTransaction } from '@/lib/db/index'
import { tenant, tenantUser, usuario, usuarioAcesso } from '@/lib/db/schema'
import { assertValidEmail, hashPassword, verifyPassword } from '@/lib/auth/password'
import {
  createAuthSession,
  destroyCurrentSession,
  getCurrentSession,
  setSelectedTenant,
} from '@/lib/auth/session'
import { redirectForAccesses } from '@/lib/auth/access'
import type { AcessoUsuario } from '@/lib/db/schema'

const SIGN_UP_ERROR_MESSAGE = 'Não foi possível criar a conta'

function formValue(data: FormData | Record<string, unknown>, key: string): string {
  if (data instanceof FormData) return String(data.get(key) ?? '')
  return String(data[key] ?? '')
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? String(error.code) : ''
  return code === '23505'
}

function slugifyTenantName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${base || 'restaurante'}-${crypto.randomUUID().slice(0, 8)}`
}

export async function signUpOwner(
  data:
    | FormData
    | {
        nome: string
        email: string
        password: string
        tenantNome?: string
        restauranteNome?: string
        empresa?: string
        empresaNome?: string
      }
): Promise<void> {
  const nome = formValue(data, 'nome').trim()
  const email = assertValidEmail(formValue(data, 'email'))
  const password = formValue(data, 'password')
  const tenantNome = (
    formValue(data, 'tenantNome') ||
    formValue(data, 'restauranteNome') ||
    formValue(data, 'empresa') ||
    formValue(data, 'empresaNome') ||
    nome
  ).trim()

  if (!nome) throw new Error('Informe seu nome')
  if (!tenantNome) throw new Error('Informe o nome do restaurante')

  const usuarioId = crypto.randomUUID()
  const tenantId = crypto.randomUUID()
  const tenantUserId = crypto.randomUUID()
  const now = new Date()
  const passwordHash = await hashPassword(password)
  const usuarioValues = {
    id: usuarioId,
    nome,
    email,
    passwordHash,
    role: 'admin' as const,
    createdAt: now,
    updatedAt: now,
  }
  const tenantValues = {
    id: tenantId,
    nome: tenantNome,
    slug: slugifyTenantName(tenantNome),
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  }
  const tenantUserValues = {
    id: tenantUserId,
    tenantId,
    usuarioId,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  }
  const acessoValues = {
    id: crypto.randomUUID(),
    tenantUserId,
    usuarioId,
    acesso: 'admin' as const,
  }

  try {
    await runInDbTransaction({
      postgresOperation: async (tx) => {
        const [existing] = await tx
          .select({ id: usuario.id })
          .from(usuario)
          .where(eq(usuario.email, email))

        if (existing) throw new Error(SIGN_UP_ERROR_MESSAGE)

        await tx.insert(usuario).values(usuarioValues)
        await tx.insert(tenant).values(tenantValues)
        await tx.insert(tenantUser).values(tenantUserValues)
        await tx.insert(usuarioAcesso).values(acessoValues)
      },
    })
  } catch (error) {
    if (
      isUniqueConstraintError(error) ||
      (error instanceof Error && error.message === SIGN_UP_ERROR_MESSAGE)
    ) {
      throw new Error(SIGN_UP_ERROR_MESSAGE)
    }
    throw error
  }

  await createAuthSession(usuarioId, tenantId)
  redirect('/selecionar-area')
}

export async function signIn(
  data: FormData | { email: string; password: string }
): Promise<void> {
  const email = assertValidEmail(formValue(data, 'email'))
  const password = formValue(data, 'password')

  const [user] = await db
    .select({ id: usuario.id, passwordHash: usuario.passwordHash })
    .from(usuario)
    .where(eq(usuario.email, email))

  const valid = await verifyPassword(password, user?.passwordHash)
  if (!user || !valid) throw new Error('E-mail ou senha incorretos')

  const memberships = await db
    .select({ id: tenantUser.id, tenantId: tenantUser.tenantId, nome: tenant.nome })
    .from(tenantUser)
    .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
    .where(
      and(
        eq(tenantUser.usuarioId, user.id),
        eq(tenantUser.status, 'active'),
        eq(tenant.status, 'active')
      )
    )

  if (memberships.length === 0) {
    await createAuthSession(user.id)
    redirect('/sem-acesso')
  }

  if (memberships.length > 1) {
    await createAuthSession(user.id)
    redirect('/selecionar-empresa')
  }

  const [membership] = memberships
  await createAuthSession(user.id, membership.tenantId)

  const accesses = await db
    .select({ acesso: usuarioAcesso.acesso })
    .from(usuarioAcesso)
    .where(
      and(
        eq(usuarioAcesso.tenantUserId, membership.id),
        eq(usuarioAcesso.usuarioId, user.id)
      )
    )

  redirect(redirectForAccesses(accesses.map((row) => row.acesso as AcessoUsuario)))
}

export async function signOut(): Promise<void> {
  await destroyCurrentSession()
  redirect('/auth/sign-in')
}

export async function listCurrentTenantMemberships(): Promise<
  Array<{ tenantId: string; nome: string }>
> {
  const session = await getCurrentSession()
  if (!session) redirect('/auth/sign-in')

  return db
    .select({ tenantId: tenantUser.tenantId, nome: tenant.nome })
    .from(tenantUser)
    .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
    .where(
      and(
        eq(tenantUser.usuarioId, session.usuarioId),
        eq(tenantUser.status, 'active'),
        eq(tenant.status, 'active')
      )
    )
}

export async function selectTenant(data: FormData | { tenantId: string }): Promise<void> {
  const session = await getCurrentSession()
  if (!session) redirect('/auth/sign-in')

  const requestedTenantId = formValue(data, 'tenantId')
  if (!requestedTenantId) throw new Error('Empresa inválida')

  const memberships = await db
    .select({ tenantId: tenantUser.tenantId })
    .from(tenantUser)
    .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
    .where(
      and(
        eq(tenantUser.usuarioId, session.usuarioId),
        eq(tenantUser.tenantId, requestedTenantId),
        eq(tenantUser.status, 'active'),
        eq(tenant.status, 'active')
      )
    )

  if (memberships.length === 0) {
    redirect('/sem-acesso')
  }

  await setSelectedTenant(requestedTenantId)
  redirect('/selecionar-area')
}
