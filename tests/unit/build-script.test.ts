import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('build script', () => {
  it('uses the standard Next build without next-pwa coupling', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const nextConfig = readFileSync(join(root, 'next.config.ts'), 'utf8')

    expect(packageJson.scripts.build).toBe('next build')
    expect(packageJson.dependencies).toHaveProperty('@neondatabase/serverless')
    expect(packageJson.dependencies).not.toHaveProperty('@neondatabase/auth')
    expect(packageJson.dependencies).not.toHaveProperty('next-pwa')
    expect(packageJson.dependencies).not.toHaveProperty('@prisma/client')
    expect(packageJson.devDependencies).not.toHaveProperty('prisma')
    expect(nextConfig).not.toContain('next-pwa')
    expect(nextConfig).not.toContain('withPWA')
  })
})
