import { NextRequest } from 'next/server'
import { addClient, removeClient } from '@/lib/sse'
import { requireAnyAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await requireAnyAccess(['cozinha', 'garcom', 'caixa'])
  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(c) {
      controller = c
      addClient(controller)
      // Send initial heartbeat
      controller.enqueue(new TextEncoder().encode(': connected\n\n'))
    },
    cancel() {
      removeClient(controller)
    },
  })

  req.signal.addEventListener('abort', () => removeClient(controller))

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
