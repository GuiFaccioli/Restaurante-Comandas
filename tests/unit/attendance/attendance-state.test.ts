import { describe, expect, it } from 'vitest'

import { deriveMesaOperationalState } from '@/lib/attendance/service'

const attendance = (id: string, status: 'open' | 'awaiting_payment' | 'paid' | 'cancelled') => ({
  id,
  status,
  total: 0,
  orderCount: 0,
  activeOrderCount: 0,
  abertoEm: '2026-07-30T18:00:00.000Z',
})

describe('mesa operational state', () => {
  it.each([
    [[], 'livre'],
    [[attendance('open', 'open')], 'em_atendimento'],
    [[attendance('pending', 'awaiting_payment')], 'conta_pendente'],
    [[attendance('open', 'open'), attendance('pending', 'awaiting_payment')], 'em_atendimento_conta_pendente'],
    [[attendance('paid', 'paid'), attendance('cancelled', 'cancelled')], 'livre'],
  ])('derives %s as %s', (attendances, expected) => {
    expect(deriveMesaOperationalState(attendances)).toBe(expected)
  })
})
