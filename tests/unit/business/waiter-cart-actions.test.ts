import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('waiter cart action semantics', () => {
  it('names every icon-only quantity/removal action and uses 44px targets', () => {
    const itemCard = source('components/garcom/item-card.tsx')
    const cart = source('components/garcom/cart-drawer.tsx')

    expect(itemCard).toContain('aria-label={`Diminuir ${produto.nome}`}')
    expect(itemCard).toContain('aria-label={`Adicionar mais ${produto.nome}`}')
    expect(cart).toContain('aria-label={`Diminuir ${item.nome}`}')
    expect(cart).toContain('aria-label={`Adicionar mais ${item.nome}`}')
    expect(cart).toContain('aria-label={`Remover ${item.nome} do carrinho`}')
    expect(itemCard).toContain('size-11')
    expect(cart).toContain('size-11')
  })

  it('announces cart confirmation pending and keeps dismiss neutral', () => {
    const cart = source('components/garcom/cart-drawer.tsx')

    expect(cart).toContain('aria-busy={sending}')
    expect(cart).toMatch(/intent="positive"[\s\S]*Confirmar pedido/)
    expect(cart).toMatch(/intent="neutral"[\s\S]*Cancelar/)
  })
})
