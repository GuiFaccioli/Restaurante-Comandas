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

const clientsByTenant = new Map<string, Set<ReadableStreamDefaultController>>()
const MIN_ACCEPTABLE_DESIRED_SIZE = 0

export function addClient(
  tenantId: string,
  controller: ReadableStreamDefaultController
) {
  let clients = clientsByTenant.get(tenantId)
  if (!clients) {
    clients = new Set()
    clientsByTenant.set(tenantId, clients)
  }

  clients.add(controller)
}

export function removeClient(
  tenantId: string,
  controller: ReadableStreamDefaultController
) {
  const clients = clientsByTenant.get(tenantId)
  if (!clients) return

  clients.delete(controller)
  if (clients.size === 0) {
    clientsByTenant.delete(tenantId)
  }
}

function closeClient(
  tenantId: string,
  controller: ReadableStreamDefaultController
) {
  removeClient(tenantId, controller)

  try {
    controller.close()
  } catch {
    // The stream may already be closed by the request lifecycle.
  }
}

export function notifyKitchen(tenantId: string, event: KitchenEvent) {
  const clients = clientsByTenant.get(tenantId)
  if (!clients) return

  const msg = `data: ${JSON.stringify(event)}\n\n`
  const encoded = new TextEncoder().encode(msg)
  clients.forEach((controller) => {
    const desiredSize = controller.desiredSize
    // Zero is a full standard queue; allow one pending event before disconnecting.
    if (desiredSize !== null && desiredSize < MIN_ACCEPTABLE_DESIRED_SIZE) {
      closeClient(tenantId, controller)
      return
    }

    try {
      controller.enqueue(encoded)
    } catch {
      removeClient(tenantId, controller)
    }
  })
}
