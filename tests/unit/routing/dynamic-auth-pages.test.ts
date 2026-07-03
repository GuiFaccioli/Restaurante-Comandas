import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('dynamic auth pages', () => {
  it('marks cookie-reading pages as force-dynamic for production builds', () => {
    const paths = [
      'app/page.tsx',
      'app/selecionar-area/page.tsx',
      'app/admin/menu/page.tsx',
      'app/admin/mesas/page.tsx',
    ]

    for (const path of paths) {
      expect(source(path), path).toContain("export const dynamic = 'force-dynamic'")
    }
  })
})
