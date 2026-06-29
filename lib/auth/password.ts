import { scrypt, timingSafeEqual, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export function assertValidEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('E-mail inválido')
  }
  return normalized
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) throw new Error('Senha deve ter pelo menos 8 caracteres')

  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer

  return `scrypt:${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false

  const [algorithm, salt, hash] = stored.split(':')
  if (algorithm !== 'scrypt' || !salt || !hash) return false

  const expected = Buffer.from(hash, 'hex')
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer

  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
