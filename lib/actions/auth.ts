'use server'

import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/index'
import { usuario, usuarioAcesso } from '@/lib/db/schema'
import { assertValidEmail, hashPassword, verifyPassword } from '@/lib/auth/password'
import { createAuthSession, destroyCurrentSession } from '@/lib/auth/session'
import { redirectForAccesses } from '@/lib/auth/access'
import type { AcessoUsuario } from '@/lib/db/schema'

function formValue(data: FormData | Record<string, unknown>, key: string): string {
  if (data instanceof FormData) return String(data.get(key) ?? '')
  return String(data[key] ?? '')
}

export async function signUpOwner(
  data:
    | FormData
    | {
        nome: string
        email: string
        password: string
      }
): Promise<void> {
  const nome = formValue(data, 'nome').trim()
  const email = assertValidEmail(formValue(data, 'email'))
  const password = formValue(data, 'password')

  if (!nome) throw new Error('Informe seu nome')

  const [existing] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.email, email))

  if (existing) throw new Error('E-mail já cadastrado')

  const usuarioId = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const now = new Date()

  await db.insert(usuario).values({
    id: usuarioId,
    nome,
    email,
    passwordHash,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(usuarioAcesso).values({
    id: crypto.randomUUID(),
    usuarioId,
    acesso: 'admin',
  })

  await createAuthSession(usuarioId)
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

  await createAuthSession(user.id)

  const accesses = await db
    .select({ acesso: usuarioAcesso.acesso })
    .from(usuarioAcesso)
    .where(eq(usuarioAcesso.usuarioId, user.id))

  redirect(redirectForAccesses(accesses.map((row) => row.acesso as AcessoUsuario)))
}

export async function signOut(): Promise<void> {
  await destroyCurrentSession()
  redirect('/auth/sign-in')
}
