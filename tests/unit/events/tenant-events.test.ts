import { afterEach, describe, expect, it, vi } from 'vitest'

import { addTenantEventClient, notifyTenant, removeTenantEventClient } from '@/lib/tenant-events'

function controller(received: string[]) {
  return {
    enqueue: vi.fn((chunk: Uint8Array) => received.push(new TextDecoder().decode(chunk))),
    close: vi.fn(),
  } as unknown as ReadableStreamDefaultController<Uint8Array>
}

describe('tenant event stream', () => {
  const clients: Array<[string, ReadableStreamDefaultController<Uint8Array>]> = []

  afterEach(() => {
    for (const [tenantId, client] of clients) removeTenantEventClient(tenantId, client)
    clients.length = 0
  })

  it('notifies only connected clients from the same tenant', () => {
    const tenantA: string[] = []
    const tenantB: string[] = []
    const clientA = controller(tenantA)
    const clientB = controller(tenantB)
    clients.push(['tenant-a', clientA], ['tenant-b', clientB])
    addTenantEventClient('tenant-a', clientA)
    addTenantEventClient('tenant-b', clientB)

    notifyTenant('tenant-a', { type: 'attendance_updated' })

    expect(tenantA.join('')).toContain('attendance_updated')
    expect(tenantB).toHaveLength(0)
  })
})
