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

function findOpeningTag(source: string, tag: string, marker: string) {
  const markerIndex = source.indexOf(marker)
  const start = source.lastIndexOf(`<${tag}`, markerIndex)
  const end = source.indexOf('>', markerIndex + marker.length)

  if (markerIndex < 0 || start < 0 || end < 0) {
    throw new Error(`Missing <${tag}> opening tag containing: ${marker}`)
  }
  return source.slice(start, end + 1)
}

describe('cashier order control', () => {
  it('uses a tenant-scoped cashier query with item details, totals, and payment status', () => {
    const queries = readProjectFile('lib/orders/queries.ts')
    const page = readProjectFile('app/admin/pedidos/page.tsx')

    expect(queries).toContain('getCashierOrders')
    expect(queries).toContain('pagamentoPedido')
    expect(queries).toContain('pagamentoStatus')
    expect(queries).toContain('precoUnitario')
    expect(queries).toContain('calculateOrderTotal')
    expect(page).toContain('getCashierOrders')
    expect(page).toContain('initialPedidos')
  })

  it('renders expandable cashier details and safe polling without losing UI state', () => {
    const client = readProjectFile('app/admin/pedidos/client.tsx')
    const paymentOpen = findJsxBlock(client, 'Button', [
      'onClick={() => openPaymentForm(pedido)}',
    ])
    const paymentSubmit = findJsxBlock(client, 'Button', ['type="submit"', 'Registrar pagamento'])
    const paymentDismiss = findJsxBlock(client, 'Button', [
      'onClick={() => setPaymentFormPedidoId(null)}',
      'Cancelar',
    ])
    const paymentFormOpeningTag = findOpeningTag(
      client,
      'form',
      'onSubmit={(event) => handlePaymentSubmit(event, pedido)}'
    )

    expect(client).toContain('Itens do pedido')
    expect(client).toContain('Total')
    expect(client).toContain('Registrar pagamento')
    expect(paymentOpen).toContain('intent="positive"')
    expect(paymentOpen).toContain('appearance="solid"')
    expect(paymentSubmit).toContain('intent="positive"')
    expect(paymentSubmit).toContain('appearance="solid"')
    expect(paymentSubmit).toContain('aria-busy={isPending}')
    expect(paymentSubmit).toContain('disabled={isPending}')
    expect(paymentDismiss).toContain('intent="destructive"')
    expect(paymentDismiss).toContain('appearance="outline"')
    expect(paymentDismiss).not.toContain('intent="neutral"')
    expect(paymentFormOpeningTag).toContain('aria-busy={isPending}')
    expect(client).toContain('/api/caixa/pedidos')
    expect(client).toContain('5000')
    expect(client).toContain('expandedId')
    expect(client).toContain('paymentFormPedidoId')
  })

  it('uses the shared semantic utility for the native stat disclosure', () => {
    const adminPage = readProjectFile('components/admin/admin-page.tsx')

    expect(adminPage).toContain("import { actionSemantics } from '@/components/ui/button'")
    expect(adminPage).toContain('actionSemantics({')
    expect(adminPage).toContain("intent: 'neutral'")
    expect(adminPage).toContain("appearance: 'ghost'")
    expect(adminPage).toContain('flex w-full flex-col gap-0')
    expect(adminPage).toContain('whitespace-normal')
    expect(adminPage).not.toContain('interactiveCardClassName = buttonVariants')
  })

  it('preserves the user choice to keep cashier order items collapsed during polling', () => {
    const client = readProjectFile('app/admin/pedidos/client.tsx')

    expect(client).toContain('if (current === null) return null')
  })

  it('keeps canceled orders out of cashier receivables', () => {
    const queries = readProjectFile('lib/orders/queries.ts')

    expect(queries).toContain('getCashierOrders')
    expect(queries).toContain("ne(pedido.status, 'cancelado')")
  })

  it('returns optional order creator and registered payment metadata', () => {
    const queries = readProjectFile('lib/orders/queries.ts')

    expect(queries).toContain('export type CashierResponsible')
    expect(queries).toContain('criadoPor: CashierResponsible | null')
    expect(queries).toContain('pagamento: CashierPayment | null')
    expect(queries).toContain('createdByUserId: pedido.createdByUserId')
    expect(queries).toContain('registradoPorUsuarioId: pagamentoPedido.registradoPorUsuarioId')
    expect(queries).toContain('valor: pagamentoPedido.valor')
    expect(queries).toContain('registradoEm: pagamentoPedido.registradoEm')
  })
})
