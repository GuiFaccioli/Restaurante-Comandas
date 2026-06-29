import { describe, expect, it } from 'vitest'
import { assertValidEmail, hashPassword, verifyPassword } from '@/lib/auth/password'

describe('password auth primitives', () => {
  it('hashes passwords without storing plaintext', async () => {
    const stored = await hashPassword('senha-segura-123')

    expect(stored).not.toBe('senha-segura-123')
    expect(stored).not.toContain('senha-segura-123')
    expect(stored.split(':')).toHaveLength(3)
  })

  it('verifies the original password and rejects a different one', async () => {
    const stored = await hashPassword('senha-segura-123')

    await expect(verifyPassword('senha-segura-123', stored)).resolves.toBe(true)
    await expect(verifyPassword('senha-errada', stored)).resolves.toBe(false)
  })

  it('normalizes valid email and rejects invalid email', () => {
    expect(assertValidEmail(' USER@Example.COM ')).toBe('user@example.com')
    expect(() => assertValidEmail('email-invalido')).toThrow('E-mail inválido')
  })
})
