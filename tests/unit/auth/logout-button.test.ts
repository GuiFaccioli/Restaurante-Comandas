import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('profile menu logout', () => {
  it('hides the sign-out action inside a profile menu', () => {
    const component = readProjectFile('components/auth/profile-menu.tsx')

    expect(component).toContain("import { signOut } from '@/lib/actions/auth'")
    expect(component).toContain("import { getCurrentSession } from '@/lib/auth/session'")
    expect(component).toContain('<details')
    expect(component).toContain('<summary')
    expect(component).toContain('Perfil')
    expect(component).toContain('action={signOut}')
    expect(component).toContain('Sair')
  })

  it('is available from protected operational screens without rendering the raw logout button', () => {
    const protectedFiles = [
      'app/admin/layout.tsx',
      'app/garcom/layout.tsx',
      'app/cozinha/layout.tsx',
      'app/selecionar-area/page.tsx',
      'app/selecionar-empresa/page.tsx',
    ]

    for (const path of protectedFiles) {
      const source = readProjectFile(path)

      expect(source, path).toContain('ProfileMenu')
      expect(source, path).not.toContain('LogoutButton')
    }
  })
})
