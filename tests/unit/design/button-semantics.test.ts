import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

function findJsxBlock(source: string, tag: string, markers: string[]) {
  const blocks = source.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'g')) ?? []
  const block = blocks.find((candidate) => {
    const normalized = candidate.replace(/\s+/g, ' ')
    return markers.every((marker) => normalized.includes(marker))
  })

  if (!block) throw new Error(`Missing <${tag}> block containing: ${markers.join(', ')}`)
  return block
}

describe('operational button semantics', () => {
  it('uses positive intent for add, save, confirm, register, and complete actions', () => {
    const paths = [
      'components/garcom/item-card.tsx',
      'components/garcom/observacao-sheet.tsx',
      'components/garcom/cart-drawer.tsx',
      'components/garcom/pending-deliveries-client.tsx',
      'components/garcom/table-orders-panel.tsx',
      'app/admin/pedidos/client.tsx',
    ]

    for (const path of paths) {
      expect(readProjectFile(path), path).toContain('intent="positive"')
    }
  })

  it('uses destructive red for every cancel action', () => {
    const controls = [
      { path: 'components/garcom/cart-drawer.tsx', tag: 'Button', markers: ['Cancelar'] },
      { path: 'app/admin/pedidos/client.tsx', tag: 'Button', markers: ['Cancelar'] },
      { path: 'components/admin/produto-form.tsx', tag: 'Button', markers: ['Cancelar'] },
    ]

    for (const { path, tag, markers } of controls) {
      const control = findJsxBlock(readProjectFile(path), tag, markers)
      expect(control, path).toMatch(/intent\s*(?:=|:)\s*['"]destructive['"]/)
    }
  })

  it('keeps dismiss, back, logout, and navigation neutral', () => {
    const controls = [
      { path: 'app/admin/pedidos/client.tsx', tag: 'Button', markers: ['Fechar itens'] },
      { path: 'app/garcom/mesa/[id]/client.tsx', tag: 'Link', markers: ['Voltar'] },
      { path: 'components/auth/profile-menu.tsx', tag: 'Button', markers: ['Sair'] },
      { path: 'app/sem-acesso/page.tsx', tag: 'Link', markers: ['Trocar área'] },
      { path: 'app/sem-acesso/page.tsx', tag: 'Button', markers: ['Sair'] },
    ]

    for (const { path, tag, markers } of controls) {
      const control = findJsxBlock(readProjectFile(path), tag, markers)
      if (tag === 'Link' && markers.includes('Voltar')) {
        expect(control, path).toContain('aria-label="Voltar"')
        continue
      }
      expect(control, path).toMatch(/intent\s*(?:=|:)\s*['"]neutral['"]/)
    }
  })

  it('keeps canceling an existing order destructive', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).toMatch(/intent="destructive"[\s\S]*Cancelar/)
  })

  it('keeps the cart count badge neutral inside the neutral cart action', () => {
    const cartFab = readProjectFile('components/garcom/cart-fab.tsx')
    const block = findJsxBlock(cartFab, 'Button', ['Abrir carrinho'])

    expect(block).toContain('bg-muted')
    expect(block).toContain('text-foreground')
    expect(block).not.toContain('bg-destructive')
  })

  it('gives icon-only waiter actions accessible names and touch targets', () => {
    const itemCard = readProjectFile('components/garcom/item-card.tsx')
    const cart = readProjectFile('components/garcom/cart-drawer.tsx')

    expect(itemCard).toContain('aria-label={`Diminuir ${produto.nome}`}')
    expect(itemCard).toContain('aria-label={`Adicionar mais ${produto.nome}`}')
    expect(cart).toContain('aria-label={`Diminuir ${item.nome}`}')
    expect(cart).toContain('aria-label={`Adicionar mais ${item.nome}`}')
    expect(cart).toContain('aria-label={`Remover ${item.nome} do carrinho`}')
    expect(itemCard).toContain('size-11')
    expect(cart).toContain('size-11')
  })

  it('announces every existing operational pending state', () => {
    expect(readProjectFile('components/garcom/table-orders-panel.tsx')).toContain(
      'aria-busy={canceling}'
    )
    expect(readProjectFile('components/garcom/table-orders-panel.tsx')).toContain(
      'aria-busy={confirming}'
    )
    expect(readProjectFile('components/garcom/pending-deliveries-client.tsx')).toContain(
      'aria-busy={pending}'
    )
    expect(readProjectFile('components/garcom/cart-drawer.tsx')).toContain(
      'aria-busy={sending}'
    )
    expect(readProjectFile('app/admin/pedidos/client.tsx')).toContain(
      'aria-busy={isPending}'
    )
  })
})
