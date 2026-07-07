import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('logout button', () => {
  it('submits the sign-out action and stays fixed in the top-right corner', () => {
    const component = readProjectFile('components/auth/logout-button.tsx')

    expect(component).toContain("import { signOut } from '@/lib/actions/auth'")
    expect(component).toContain('action={signOut}')
    expect(component).toContain('Sair')
    expect(component).toMatch(/fixed[\s\S]*top-4[\s\S]*right-4/)
  })

  it('is available from protected operational screens', () => {
    const protectedFiles = [
      'app/admin/layout.tsx',
      'app/garcom/layout.tsx',
      'app/cozinha/layout.tsx',
      'app/selecionar-area/page.tsx',
      'app/selecionar-empresa/page.tsx',
    ]

    for (const path of protectedFiles) {
      expect(readProjectFile(path), path).toContain('LogoutButton')
    }
  })
})
