import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { authSession, usuario } from '@/lib/db/schema'

const SESSION_COOKIE = 'restaurante_session'
const SESSION_DAYS = 30

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function cookieStore() {
  return cookies()
}

export async function createAuthSession(
  usuarioId: string,
  selectedTenantId: string | null = null
): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(authSession).values({
    id: crypto.randomUUID(),
    usuarioId,
    selectedTenantId,
    tokenHash,
    expiresAt,
    createdAt: new Date(),
  })

  const store = await cookieStore()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function getCurrentSession(): Promise<{
  usuarioId: string
  email: string
  nome: string
  selectedTenantId: string | null
} | null> {
  const store = await cookieStore()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const [session] = await db
    .select({
      usuarioId: authSession.usuarioId,
      selectedTenantId: authSession.selectedTenantId,
    })
    .from(authSession)
    .where(and(eq(authSession.tokenHash, hashToken(token)), gt(authSession.expiresAt, new Date())))

  if (!session) return null

  const [user] = await db
    .select({ id: usuario.id, email: usuario.email, nome: usuario.nome })
    .from(usuario)
    .where(eq(usuario.id, session.usuarioId))

  if (!user) return null

  return {
    usuarioId: user.id,
    email: user.email,
    nome: user.nome,
    selectedTenantId: session.selectedTenantId ?? null,
  }
}

export async function setSelectedTenant(tenantId: string): Promise<void> {
  const store = await cookieStore()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return

  await db
    .update(authSession)
    .set({ selectedTenantId: tenantId })
    .where(and(eq(authSession.tokenHash, hashToken(token)), gt(authSession.expiresAt, new Date())))
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookieStore()
  const token = store.get(SESSION_COOKIE)?.value

  if (token) {
    await db.delete(authSession).where(eq(authSession.tokenHash, hashToken(token)))
  }

  store.delete(SESSION_COOKIE)
}
