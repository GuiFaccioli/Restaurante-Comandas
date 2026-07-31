import { NextRequest } from 'next/server'

import { requireAnyAccess } from '@/lib/auth/access'
import { addTenantEventClient, removeTenantEventClient } from '@/lib/tenant-events'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<Response> {
  const { tenantId } = await requireAnyAccess(['cozinha', 'garcom', 'caixa'])
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  let registered = false

  const cleanup = () => {
    if (registered && controller) {
      removeTenantEventClient(tenantId, controller)
      registered = false
    }
    try {
      controller?.close()
    } catch {
      // The stream may already be closed by the request lifecycle.
    }
  }

  request.signal.addEventListener('abort', cleanup, { once: true })
  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController
      if (request.signal.aborted) {
        cleanup()
        return
      }
      addTenantEventClient(tenantId, streamController)
      registered = true
      streamController.enqueue(new TextEncoder().encode(': connected\n\n'))
    },
    cancel: cleanup,
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
