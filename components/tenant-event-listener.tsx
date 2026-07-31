'use client'

import { useEffect } from 'react'
import type { TenantEvent } from '@/lib/tenant-events'

export function TenantEventListener({ onEvent }: { onEvent: (event: TenantEvent) => void }) {
  useEffect(() => {
    if (typeof EventSource === 'undefined') return
    const events = new EventSource('/api/events')
    events.onmessage = (message) => {
      try {
        onEvent(JSON.parse(message.data) as TenantEvent)
      } catch {
        // Ignore malformed events and let the polling fallback recover state.
      }
    }
    return () => events.close()
  }, [onEvent])

  return null
}
