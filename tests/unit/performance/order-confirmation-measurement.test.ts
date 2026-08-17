import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('order confirmation measurement', () => {
  it('is inert unless PERF_ORDER_CONFIRMATION is exactly 1', async () => {
    vi.stubEnv('PERF_ORDER_CONFIRMATION', 'true')
    vi.resetModules()
    const measurement = await import('@/lib/performance/order-confirmation-measurement')
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    await expect(measurement.runOrderConfirmationMeasurement(async () => 'ok')).resolves.toBe('ok')

    expect(info).not.toHaveBeenCalled()
  })

  it('keeps concurrent operations correlated independently', async () => {
    vi.stubEnv('PERF_ORDER_CONFIRMATION', '1')
    vi.resetModules()
    const measurement = await import('@/lib/performance/order-confirmation-measurement')
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    await Promise.all([
      measurement.runOrderConfirmationMeasurement(async () => {
        measurement.setOrderConfirmationMeasurementContext({ tenantId: 'tenant-a' })
        await new Promise((resolve) => setTimeout(resolve, 10))
        await measurement.measureOrderConfirmationPhase('transaction', async () => undefined)
      }),
      measurement.runOrderConfirmationMeasurement(async () => {
        measurement.setOrderConfirmationMeasurementContext({ tenantId: 'tenant-b' })
        await measurement.measureOrderConfirmationPhase('transaction', async () => undefined)
      }),
    ])

    const entries = info.mock.calls.map(([entry]) => JSON.parse(String(entry)))
    expect(entries).toHaveLength(2)
    expect(new Set(entries.map((entry) => entry.request_id)).size).toBe(2)
    expect(new Set(entries.map((entry) => entry.tenant_fingerprint)).size).toBe(2)
    expect(entries.every((entry) => entry.durations_ms.transaction >= 0)).toBe(true)
  })
})
