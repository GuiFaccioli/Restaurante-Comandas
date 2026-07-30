import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const source = (path: string) => readFileSync(join(root, path), 'utf8')

describe('MenuAdminClient', () => {
  it('keeps the real catalog management flow with the new responsive structure', () => {
    const client = source('app/admin/menu/client.tsx')
    const page = source('app/admin/menu/page.tsx')

    expect(client).toContain('AdminPageHeader')
    expect(client).toContain('CategoryManager')
    expect(client).toContain('ProdutoForm')
    expect(client).toContain('Novo produto')
    expect(client).toContain('toggleDisponivel')
    expect(client).toContain('Ações')
    expect(page).toContain("requireAccess('admin')")
    expect(page).toContain('categoriaComProdutos')
  })
})
