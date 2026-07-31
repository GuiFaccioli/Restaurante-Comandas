'use client'

import { useEffect, useState } from 'react'
import { formatElapsedDuration } from '@/lib/time/elapsed'

export function LiveElapsedTimer({ startedAt }: { startedAt: Date | string | number }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return <span>{formatElapsedDuration(startedAt, now ?? startedAt)}</span>
}
