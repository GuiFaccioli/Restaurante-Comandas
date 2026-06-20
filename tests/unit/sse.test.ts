import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addClient, removeClient, notifyKitchen } from '@/lib/sse'

describe('SSE notifyKitchen', () => {
  let received: string[] = []
  let controller: ReadableStreamDefaultController

  beforeEach(() => {
    received = []
    controller = {
      enqueue: (chunk: Uint8Array) => received.push(new TextDecoder().decode(chunk)),
    } as unknown as ReadableStreamDefaultController
  })

  it('sends event to connected client', () => {
    addClient(controller)
    notifyKitchen({ type: 'novo_pedido', payload: { pedidoId: 'abc', mesaNumero: 4, itens: ['Margherita'] } })
    expect(received).toHaveLength(1)
    expect(received[0]).toContain('novo_pedido')
    removeClient(controller)
  })

  it('does not send after client removed', () => {
    addClient(controller)
    removeClient(controller)
    notifyKitchen({ type: 'status_atualizado', payload: { pedidoId: 'abc', status: 'pronto' } })
    expect(received).toHaveLength(0)
  })

  it('handles enqueue error gracefully', () => {
    const badController = {
      enqueue: () => { throw new Error('stream closed') },
    } as unknown as ReadableStreamDefaultController
    addClient(badController)
    expect(() =>
      notifyKitchen({ type: 'produto_indisponivel', payload: { produtoId: 'x' } })
    ).not.toThrow()
  })
})
