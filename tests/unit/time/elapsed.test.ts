import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LiveElapsedTimer } from '@/components/live-elapsed-timer'
import { formatElapsedDuration } from '@/lib/time/elapsed'

describe('formatElapsedDuration', () => {
  it('formats elapsed durations under one hour as MM:SS', () => {
    const start = new Date('2026-07-01T10:00:00.000Z')

    expect(formatElapsedDuration(start, new Date('2026-07-01T10:00:00.000Z'))).toBe('00:00')
    expect(formatElapsedDuration(start, new Date('2026-07-01T10:01:05.000Z'))).toBe('01:05')
    expect(formatElapsedDuration(start, new Date('2026-07-01T10:59:59.000Z'))).toBe('59:59')
  })

  it('formats elapsed durations of one hour or more as HH:MM:SS', () => {
    expect(
      formatElapsedDuration(
        new Date('2026-07-01T10:00:00.000Z'),
        new Date('2026-07-01T11:00:00.000Z')
      )
    ).toBe('01:00:00')
  })

  it('clamps future timestamps to zero', () => {
    expect(
      formatElapsedDuration(
        new Date('2026-07-01T10:01:00.000Z'),
        new Date('2026-07-01T10:00:00.000Z')
      )
    ).toBe('00:00')
  })
})

describe('LiveElapsedTimer hydration', () => {
  it('renders a deterministic elapsed value during server rendering', () => {
    vi.setSystemTime(new Date('2026-07-01T10:02:34.000Z'))

    expect(renderToStaticMarkup(createElement(LiveElapsedTimer, {
      startedAt: new Date('2026-07-01T10:00:00.000Z'),
    }))).toBe('<span>00:00</span>')

    vi.useRealTimers()
  })
})
