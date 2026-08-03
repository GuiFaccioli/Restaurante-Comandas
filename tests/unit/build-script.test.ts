import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'

const root = process.cwd()

describe('build script', () => {
  it('uses the standard Next build without next-pwa coupling', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const nextConfig = readFileSync(join(root, 'next.config.ts'), 'utf8')

    expect(packageJson.scripts.build).toBe('next build')
    expect(packageJson.dependencies).toHaveProperty('@neondatabase/serverless')
    expect(packageJson.dependencies).toHaveProperty('@neondatabase/auth')
    expect(packageJson.dependencies).not.toHaveProperty('next-pwa')
    expect(packageJson.dependencies).not.toHaveProperty('@prisma/client')
    expect(packageJson.devDependencies).not.toHaveProperty('prisma')
    expect(nextConfig).not.toContain('next-pwa')
    expect(nextConfig).not.toContain('withPWA')
  })

  it('does not ship unused form and drag-and-drop dependencies', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

    expect(packageJson.dependencies).not.toHaveProperty('@dnd-kit/core')
    expect(packageJson.dependencies).not.toHaveProperty('@dnd-kit/sortable')
    expect(packageJson.dependencies).not.toHaveProperty('@hookform/resolvers')
    expect(packageJson.dependencies).not.toHaveProperty('react-hook-form')
    expect(packageJson.dependencies).not.toHaveProperty('zod')
  })

  it('does not ship unused UI component modules', () => {
    expect(existsSync(join(root, 'components/ui/card.tsx'))).toBe(false)
    expect(existsSync(join(root, 'components/ui/form.tsx'))).toBe(false)
    expect(existsSync(join(root, 'components/ui/select.tsx'))).toBe(false)
  })
})
