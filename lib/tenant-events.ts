export type TenantEvent = {
  type: 'attendance_updated'
}

type StreamController = ReadableStreamDefaultController<Uint8Array>

const clientsByTenant = new Map<string, Set<StreamController>>()
const encoder = new TextEncoder()

export function addTenantEventClient(tenantId: string, controller: StreamController): void {
  const clients = clientsByTenant.get(tenantId) ?? new Set<StreamController>()
  clients.add(controller)
  clientsByTenant.set(tenantId, clients)
}

export function removeTenantEventClient(tenantId: string, controller: StreamController): void {
  const clients = clientsByTenant.get(tenantId)
  if (!clients) return
  clients.delete(controller)
  if (clients.size === 0) clientsByTenant.delete(tenantId)
}

export function notifyTenant(tenantId: string, event: TenantEvent): void {
  const clients = clientsByTenant.get(tenantId)
  if (!clients) return
  const message = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)

  for (const controller of clients) {
    try {
      controller.enqueue(message)
    } catch {
      removeTenantEventClient(tenantId, controller)
    }
  }
}
