import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('operational button semantics', () => {
  it('maps the legacy success alias to a positive solid action', () => {
    const button = readProjectFile('components/ui/button.tsx')

    expect(button).toContain("success: { intent: 'positive', appearance: 'solid' }")
  })

  it('uses success styling for add, confirm, and continue operational actions', () => {
    const cartDrawer = readProjectFile('components/garcom/cart-drawer.tsx')
    const cartFab = readProjectFile('components/garcom/cart-fab.tsx')
    const deliveries = readProjectFile('components/garcom/pending-deliveries-client.tsx')

    expect(cartDrawer).toMatch(/intent="positive"[\s\S]*Confirmar pedido/)
    expect(cartDrawer).toMatch(/intent="positive"[\s\S]*<Plus/)
    expect(cartFab).toContain('intent="neutral"')
    expect(deliveries).toMatch(/variant="success"[\s\S]*Confirmar entrega/)
    expect(deliveries).toMatch(/buttonVariants\(\{ variant: 'success' \}\)/)
  })

  it('keeps the unpersisted cart dismissal neutral', () => {
    const cartDrawer = readProjectFile('components/garcom/cart-drawer.tsx')

    expect(cartDrawer).toMatch(/intent="neutral"[\s\S]*Cancelar/)
  })
})
