import { describe, it, expect, vi } from 'vitest'
import { addClient, removeClient, notifyKitchen } from '@/lib/sse'

describe('SSE notifyKitchen', () => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  function createController(received: string[]) {
    return {
      desiredSize: 1,
      enqueue: vi.fn((chunk: Uint8Array) => {
        received.push(new TextDecoder().decode(chunk))
      }),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController
  }

  function createRealClient(tenantId: string) {
    let controller!: ReadableStreamDefaultController<Uint8Array>
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c
        addClient(tenantId, controller)
        controller.enqueue(encoder.encode(': connected\n\n'))
      },
    })

    return { controller, stream }
  }

  it('delivers an event only to clients connected to the same tenant', () => {
    const tenantAReceived: string[] = []
    const tenantBReceived: string[] = []
    const tenantAController = createController(tenantAReceived)
    const tenantBController = createController(tenantBReceived)

    addClient('tenant-a', tenantAController)
    addClient('tenant-b', tenantBController)

    notifyKitchen('tenant-a', {
      type: 'novo_pedido',
      payload: {
        pedidoId: 'abc',
        mesaNumero: 4,
        itens: [{ nome: 'Margherita', quantidade: 1 }],
      },
    })

    expect(tenantAReceived).toHaveLength(1)
    expect(tenantAReceived[0]).toContain('novo_pedido')
    expect(tenantBReceived).toHaveLength(0)

    removeClient('tenant-a', tenantAController)
    removeClient('tenant-b', tenantBController)
  })

  it('removing a client from one tenant does not affect another tenant', () => {
    const tenantAReceived: string[] = []
    const tenantBReceived: string[] = []
    const tenantAController = createController(tenantAReceived)
    const tenantBController = createController(tenantBReceived)

    addClient('tenant-a', tenantAController)
    addClient('tenant-b', tenantBController)
    removeClient('tenant-a', tenantAController)

    notifyKitchen('tenant-a', {
      type: 'status_atualizado',
      payload: { pedidoId: 'order-a', status: 'pronto' },
    })
    notifyKitchen('tenant-b', {
      type: 'status_atualizado',
      payload: { pedidoId: 'order-b', status: 'pronto' },
    })

    expect(tenantAReceived).toHaveLength(0)
    expect(tenantBReceived).toHaveLength(1)

    removeClient('tenant-b', tenantBController)
  })

  it('removes only the failing controller from its tenant', () => {
    const tenantAReceived: string[] = []
    const tenantBReceived: string[] = []
    const badController = {
      desiredSize: 1,
      enqueue: vi.fn(() => {
        throw new Error('stream closed')
      }),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController
    const healthyTenantAController = createController(tenantAReceived)
    const tenantBController = createController(tenantBReceived)

    addClient('tenant-a', badController)
    addClient('tenant-a', healthyTenantAController)
    addClient('tenant-b', tenantBController)

    expect(() =>
      notifyKitchen('tenant-a', {
        type: 'status_atualizado',
        payload: { pedidoId: 'x', status: 'pronto' },
      })
    ).not.toThrow()

    notifyKitchen('tenant-a', {
      type: 'status_atualizado',
      payload: { pedidoId: 'y', status: 'pronto' },
    })
    notifyKitchen('tenant-b', {
      type: 'status_atualizado',
      payload: { pedidoId: 'z', status: 'pronto' },
    })

    expect(badController.enqueue).toHaveBeenCalledTimes(1)
    expect(tenantAReceived).toHaveLength(2)
    expect(tenantBReceived).toHaveLength(1)

    removeClient('tenant-a', healthyTenantAController)
    removeClient('tenant-b', tenantBController)
  })

  it('keeps the first event pending behind a heartbeat on a real stream', async () => {
    const { controller, stream } = createRealClient('tenant-real')

    expect(controller.desiredSize).toBe(0)

    notifyKitchen('tenant-real', {
      type: 'status_atualizado',
      payload: { pedidoId: 'first', status: 'pronto' },
    })

    const reader = stream.getReader()
    const heartbeat = await reader.read()
    const event = await reader.read()

    expect(decoder.decode(heartbeat.value)).toBe(': connected\n\n')
    expect(decoder.decode(event.value)).toContain('"pedidoId":"first"')

    removeClient('tenant-real', controller)
    await reader.cancel()
  })

  it('disconnects a real stream only after backlog exceeds the limit', async () => {
    const tenantId = 'tenant-real-backlog'
    const slow = createRealClient(tenantId)
    const healthy = createRealClient(tenantId)
    const healthyReader = healthy.stream.getReader()

    expect(decoder.decode((await healthyReader.read()).value)).toBe(': connected\n\n')

    notifyKitchen(tenantId, {
      type: 'status_atualizado',
      payload: { pedidoId: 'first', status: 'pronto' },
    })
    notifyKitchen(tenantId, {
      type: 'status_atualizado',
      payload: { pedidoId: 'second', status: 'pronto' },
    })

    const slowReader = slow.stream.getReader()
    const slowHeartbeat = await slowReader.read()
    const slowFirstEvent = await slowReader.read()
    const slowDone = await slowReader.read()
    const healthyFirstEvent = await healthyReader.read()
    const healthySecondEvent = await healthyReader.read()

    expect(decoder.decode(slowHeartbeat.value)).toBe(': connected\n\n')
    expect(decoder.decode(slowFirstEvent.value)).toContain('"pedidoId":"first"')
    expect(slowDone).toEqual({ done: true, value: undefined })
    expect(decoder.decode(healthyFirstEvent.value)).toContain('"pedidoId":"first"')
    expect(decoder.decode(healthySecondEvent.value)).toContain('"pedidoId":"second"')

    removeClient(tenantId, healthy.controller)
    await healthyReader.cancel()
  })

  it('closes and removes a client whose backlog exceeded the limit without affecting healthy clients', () => {
    const tenantAReceived: string[] = []
    const tenantBReceived: string[] = []
    const slowEnqueue = vi.fn()
    const slowClose = vi.fn()
    const slowController = {
      desiredSize: -1,
      enqueue: slowEnqueue,
      close: slowClose,
    } as unknown as ReadableStreamDefaultController
    const healthyTenantAController = createController(tenantAReceived)
    const tenantBController = createController(tenantBReceived)

    addClient('tenant-a', slowController)
    addClient('tenant-a', healthyTenantAController)
    addClient('tenant-b', tenantBController)

    notifyKitchen('tenant-a', {
      type: 'status_atualizado',
      payload: { pedidoId: 'x', status: 'pronto' },
    })
    notifyKitchen('tenant-a', {
      type: 'status_atualizado',
      payload: { pedidoId: 'y', status: 'pronto' },
    })
    notifyKitchen('tenant-b', {
      type: 'status_atualizado',
      payload: { pedidoId: 'z', status: 'pronto' },
    })

    expect(slowEnqueue).not.toHaveBeenCalled()
    expect(slowClose).toHaveBeenCalledTimes(1)
    expect(tenantAReceived).toHaveLength(2)
    expect(tenantBReceived).toHaveLength(1)

    removeClient('tenant-a', healthyTenantAController)
    removeClient('tenant-b', tenantBController)
  })

  it('allows a fresh client after backpressure removes the tenant last client', () => {
    const replacementReceived: string[] = []
    const slowEnqueue = vi.fn()
    const slowClose = vi.fn()
    const slowController = {
      desiredSize: -1,
      enqueue: slowEnqueue,
      close: slowClose,
    } as unknown as ReadableStreamDefaultController
    const replacementController = createController(replacementReceived)
    const event = {
      type: 'status_atualizado' as const,
      payload: { pedidoId: 'x', status: 'pronto' },
    }

    addClient('tenant-a', slowController)
    notifyKitchen('tenant-a', event)
    notifyKitchen('tenant-a', event)

    expect(slowEnqueue).not.toHaveBeenCalled()
    expect(slowClose).toHaveBeenCalledTimes(1)

    addClient('tenant-a', replacementController)
    notifyKitchen('tenant-a', event)

    expect(replacementReceived).toHaveLength(1)
    removeClient('tenant-a', replacementController)
  })
})
