'use client'
import { useEffect } from 'react'
import type { KitchenEvent } from '@/lib/sse'

type Props = {
  onEvent: (event: KitchenEvent) => void
}

export function SseListener({ onEvent }: Props) {
  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onmessage = (e) => {
      try {
        const event: KitchenEvent = JSON.parse(e.data)
        onEvent(event)
      } catch { /* ignore malformed */ }
    }
    es.onerror = () => {
      // Browser auto-reconnects on error
    }
    return () => es.close()
  }, [onEvent])

  return null
}
