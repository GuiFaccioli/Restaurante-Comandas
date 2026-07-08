import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('access navigation controls', () => {
  it('gives blocked users a visible way to leave or return to access selection', () => {
    const page = source('app/sem-acesso/page.tsx')

    expect(page).toContain("import { signOut } from '@/lib/actions/auth'")
    expect(page).toContain('action={signOut}')
    expect(page).toContain('Sair')
    expect(page).toContain('href="/selecionar-area"')
    expect(page).toContain('Trocar área')
    expect(page).not.toContain('<Button asChild')
  })

  it('keeps protected operational area switching inside the profile menu', () => {
    const layouts = [
      { path: 'app/admin/layout.tsx', currentAccess: 'admin' },
      { path: 'app/cozinha/layout.tsx', currentAccess: 'cozinha' },
      { path: 'app/garcom/layout.tsx', currentAccess: 'garcom' },
    ]

    for (const { path, currentAccess } of layouts) {
      const layout = source(path)

      expect(layout, path).not.toContain('href="/selecionar-area"')
      expect(layout, path).not.toContain('Trocar área')
      expect(layout, path).toContain('ProfileMenu')
      expect(layout, path).toContain(`currentAccess="${currentAccess}"`)
    }
  })
})
