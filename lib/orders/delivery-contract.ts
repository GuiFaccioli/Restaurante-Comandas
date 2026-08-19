import type { ConfirmarPedidoItem } from '@/lib/actions/pedidos'

export type ConfirmarPedidoDeliveryInput = {
  clienteId: string
  enderecoId: string
  taxaEntrega: string
  items: ConfirmarPedidoItem[]
}

export function validateDeliveryOrderInput(
  input: ConfirmarPedidoDeliveryInput,
): void {
  if (!input.clienteId.trim()) {
    throw new Error('Cliente obrigatório para pedido DELIVERY')
  }
  if (!input.enderecoId.trim()) {
    throw new Error('Endereço obrigatório para pedido DELIVERY')
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(input.taxaEntrega.trim())) {
    throw new Error('Taxa de entrega obrigatória para pedido DELIVERY')
  }
  if (Number(input.taxaEntrega) < 0) {
    throw new Error('Taxa de entrega inválida')
  }
  if (input.items.length === 0) {
    throw new Error('Pedido vazio: adicione pelo menos um item ao pedido')
  }
}
