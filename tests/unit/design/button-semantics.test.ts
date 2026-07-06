import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('operational button semantics', () => {
  it('provides a green success variant for positive actions', () => {
    const button = readProjectFile('components/ui/button.tsx')

    expect(button).toContain('success:')
    expect(button).toMatch(/success:\s*"[^"]*(bg-green|emerald|text-white)/)
  })

  it('uses success styling for add, confirm, and continue operational actions', () => {
    const cartDrawer = readProjectFile('components/garcom/cart-drawer.tsx')
    const cartFab = readProjectFile('components/garcom/cart-fab.tsx')
    const deliveries = readProjectFile('components/garcom/pending-deliveries-client.tsx')

    expect(cartDrawer).toMatch(/variant="success"[\s\S]*Confirmar pedido/)
    expect(cartDrawer).toMatch(/variant="success"[\s\S]*<Plus/)
    expect(cartFab).toContain('variant="success"')
    expect(deliveries).toMatch(/variant="success"[\s\S]*Confirmar entrega/)
    expect(deliveries).toMatch(/buttonVariants\(\{ variant: 'success' \}\)/)
  })

  it('uses destructive styling for cancel actions', () => {
    const cartDrawer = readProjectFile('components/garcom/cart-drawer.tsx')

    expect(cartDrawer).toMatch(/variant="destructive"[\s\S]*Cancelar/)
  })
})
