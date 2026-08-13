import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('page rendering modes', () => {
  it('keeps the landing page static and cookie-reading pages dynamic', () => {
    expect(source('app/page.tsx')).toContain('export const dynamic = "force-static"')

    const paths = [
      'app/selecionar-area/page.tsx',
      'app/admin/menu/page.tsx',
      'app/admin/mesas/page.tsx',
      'app/admin/layout.tsx',
      'app/garcom/layout.tsx',
      'app/cozinha/layout.tsx',
    ]

    for (const path of paths) {
      expect(source(path), path).toContain("export const dynamic = 'force-dynamic'")
    }
  })
})
