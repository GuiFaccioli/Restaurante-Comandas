import { NextRequest } from 'next/server'
import { addClient, removeClient } from '@/lib/sse'
import { requireAnyAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { tenantId } = await requireAnyAccess(['cozinha', 'garcom', 'caixa'])
  let controller: ReadableStreamDefaultController | undefined
  let registered = false
  let cleanedUp = false

  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    req.signal.removeEventListener('abort', cleanup)

    if (registered && controller) {
      removeClient(tenantId, controller)
      registered = false
    }

    if (controller) {
      try {
        controller.close()
      } catch {
        // The stream may already be closing through cancel().
      }
    }
  }

  req.signal.addEventListener('abort', cleanup, { once: true })
  const abortedBeforeStream = req.signal.aborted

  const stream = new ReadableStream({
    start(c) {
      controller = c
      if (abortedBeforeStream || req.signal.aborted) {
        cleanup()
        return
      }

      addClient(tenantId, controller)
      registered = true
      // Send initial heartbeat
      controller.enqueue(new TextEncoder().encode(': connected\n\n'))
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
