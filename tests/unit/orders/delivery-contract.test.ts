import { describe, expect, it } from 'vitest'

import {
  validateDeliveryOrderInput,
  type ConfirmarPedidoDeliveryInput,
} from '@/lib/orders/delivery-contract'

const validInput: ConfirmarPedidoDeliveryInput = {
  clienteId: 'cliente-1',
  enderecoId: 'endereco-1',
  taxaEntrega: '4.50',
  items: [{ produtoId: 'produto-1', quantidade: 1 }],
}

describe('delivery order contract', () => {
  it('accepts a delivery order without a table and allows a zero fee', () => {
    expect(() => validateDeliveryOrderInput({
      ...validInput,
      taxaEntrega: '0.00',
    })).not.toThrow()
  })

  it.each([
    ['clienteId', { clienteId: '' }, 'cliente'],
    ['enderecoId', { enderecoId: '' }, 'endereço'],
    ['taxaEntrega', { taxaEntrega: '' }, 'taxa'],
  ] as const)('rejects a delivery order without %s', (_field, override, message) => {
    expect(() => validateDeliveryOrderInput({
      ...validInput,
      ...override,
    })).toThrow(new RegExp(message, 'i'))
  })
})
