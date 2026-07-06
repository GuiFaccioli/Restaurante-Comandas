import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('remembered login email', () => {
  it('uses a client sign-in form that remembers only the last email', () => {
    const client = readProjectFile('app/auth/sign-in/client.tsx')

    expect(client).toContain("'use client'")
    expect(client).toContain('restaurante:last-login-email')
    expect(client).toContain('localStorage.getItem')
    expect(client).toContain('localStorage.setItem')
    expect(client).toContain('autoComplete="email"')
    expect(client).toContain('autoComplete="current-password"')
    expect(client).not.toContain('restaurante:last-login-password')
    expect(client).not.toMatch(/localStorage\.setItem\([^)]*password/i)
  })

  it('renders the client form from the server page', () => {
    const page = readProjectFile('app/auth/sign-in/page.tsx')

    expect(page).toContain('SignInClientForm')
    expect(page).toContain('<SignInClientForm action={signIn} />')
  })
})
