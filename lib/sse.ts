// NOTE: SSE clients are stored in module-level memory.
// This works for single-process deployments only (e.g., one Next.js worker).
// For multi-process or serverless (Vercel), replace with Redis pub/sub (Upstash).

export type KitchenEvent =
  | {
      type: 'novo_pedido'
      payload: {
        pedidoId: string
        mesaNumero: number
        itens: Array<{
          nome: string
          quantidade: number
          categoriaNome?: string | null
          observacao?: string | null
        }>
      }
    }
  | { type: 'status_atualizado'; payload: { pedidoId: string; status: string } }
  | { type: 'produto_indisponivel'; payload: { produtoId: string } }

const clients = new Set<ReadableStreamDefaultController>()

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller)
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller)
}

export function notifyKitchen(event: KitchenEvent) {
  const msg = `data: ${JSON.stringify(event)}\n\n`
  const encoded = new TextEncoder().encode(msg)
  clients.forEach((c) => {
    try { c.enqueue(encoded) } catch { clients.delete(c) }
  })
}
