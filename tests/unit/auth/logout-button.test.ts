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
    const clientComponent = readProjectFile('components/auth/profile-menu-client.tsx')

    expect(component).toContain("import { signOut } from '@/lib/actions/auth'")
    expect(component).toContain("import { getCurrentSession } from '@/lib/auth/session'")
    expect(component).toContain('ProfileMenuClient')
    expect(clientComponent).toContain('Perfil')
    expect(component).toContain('action={signOut}')
    expect(component).toContain('Sair')
  })

  it('closes the profile menu when the user clicks outside it', () => {
    const clientComponent = readProjectFile('components/auth/profile-menu-client.tsx')

    expect(clientComponent).toContain("'use client'")
    expect(clientComponent).toContain('document.addEventListener')
    expect(clientComponent).toContain('pointerdown')
    expect(clientComponent).toContain('contains(event.target)')
    expect(clientComponent).toContain('setOpen(false)')
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
