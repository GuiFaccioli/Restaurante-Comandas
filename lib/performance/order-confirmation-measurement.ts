import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash, randomUUID } from 'node:crypto'

type MeasurementContext = {
  requestId: string
  startedAt: number
  tenantFingerprint: string | null
  productLineCount: number | null
  uniqueProducts: number | null
  totalIngredients: number | null
  queryCount: number
  phases: Record<string, number>
  status: 'success' | 'error'
}

const measurementStorage = new AsyncLocalStorage<MeasurementContext>()
const measurementEnabled = process.env.PERF_ORDER_CONFIRMATION === '1'

export const orderConfirmationDrizzleLogger = {
  logQuery(): void {
    if (!measurementEnabled) return
    const context = measurementStorage.getStore()
    if (context) context.queryCount += 1
  },
}

function tenantFingerprint(tenantId: string): string {
  return createHash('sha256')
    .update(`restaurante-comandas:tenant:${tenantId}`)
    .digest('hex')
    .slice(0, 12)
}

function durationInMilliseconds(startedAt: number): number {
  return Number((performance.now() - startedAt).toFixed(2))
}

export function isOrderConfirmationMeasurementEnabled(): boolean {
  return measurementEnabled
}

export function setOrderConfirmationMeasurementContext(values: {
  tenantId?: string
  productLineCount?: number
  uniqueProducts?: number
  totalIngredients?: number
}): void {
  const context = measurementStorage.getStore()
  if (!context) return
  if (values.tenantId !== undefined) context.tenantFingerprint = tenantFingerprint(values.tenantId)
  if (values.productLineCount !== undefined) context.productLineCount = values.productLineCount
  if (values.uniqueProducts !== undefined) context.uniqueProducts = values.uniqueProducts
  if (values.totalIngredients !== undefined) context.totalIngredients = values.totalIngredients
}

export async function measureOrderConfirmationPhase<TResult>(
  phase: string,
  operation: () => Promise<TResult>,
): Promise<TResult> {
  const context = measurementStorage.getStore()
  if (!context) return operation()

  const startedAt = performance.now()
  try {
    return await operation()
  } finally {
    context.phases[phase] = (context.phases[phase] ?? 0) + durationInMilliseconds(startedAt)
  }
}

export async function runOrderConfirmationMeasurement<TResult>(
  operation: () => Promise<TResult>,
): Promise<TResult> {
  if (!measurementEnabled) return operation()

  const context: MeasurementContext = {
    requestId: randomUUID(),
    startedAt: performance.now(),
    tenantFingerprint: null,
    productLineCount: null,
    uniqueProducts: null,
    totalIngredients: null,
    queryCount: 0,
    phases: {},
    status: 'success',
  }

  return measurementStorage.run(context, async () => {
    try {
      return await operation()
    } catch (error) {
      context.status = 'error'
      throw error
    } finally {
      context.phases.total = durationInMilliseconds(context.startedAt)
      console.info(JSON.stringify({
        event: 'order_confirmation_performance',
        request_id: context.requestId,
        tenant_fingerprint: context.tenantFingerprint,
        product_line_count: context.productLineCount,
        unique_products: context.uniqueProducts,
        total_ingredients: context.totalIngredients,
        query_count: context.queryCount,
        durations_ms: context.phases,
        status: context.status,
      }))
    }
  })
}
