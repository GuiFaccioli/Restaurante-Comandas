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

export async function createAuthSession(usuarioId: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(authSession).values({
    usuarioId,
    tokenHash,
    expiresAt,
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
} | null> {
  const store = await cookieStore()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const [session] = await db
    .select({
      usuarioId: authSession.usuarioId,
    })
    .from(authSession)
    .where(and(eq(authSession.tokenHash, hashToken(token)), gt(authSession.expiresAt, new Date())))

  if (!session) return null

  const [user] = await db
    .select({ id: usuario.id, email: usuario.email, nome: usuario.nome })
    .from(usuario)
    .where(eq(usuario.id, session.usuarioId))

  if (!user) return null

  return { usuarioId: user.id, email: user.email, nome: user.nome }
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookieStore()
  const token = store.get(SESSION_COOKIE)?.value

  if (token) {
    await db.delete(authSession).where(eq(authSession.tokenHash, hashToken(token)))
  }

  store.delete(SESSION_COOKIE)
}
