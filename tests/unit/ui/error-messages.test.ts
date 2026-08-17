import { describe, expect, it } from 'vitest'

import { userFacingErrorMessage } from '@/lib/ui/error-messages'

describe('userFacingErrorMessage', () => {
  it('keeps a specific user-facing message', () => {
    expect(userFacingErrorMessage(new Error('Sem estoque: Farinha'), 'fallback')).toBe('Sem estoque: Farinha')
  })

  it('replaces technical messages with the contextual fallback', () => {
    expect(userFacingErrorMessage(new Error('database connection failed'), 'Não foi possível concluir.')).toBe('Não foi possível concluir.')
  })

  it('replaces oversized messages to avoid exposing raw technical details', () => {
    expect(userFacingErrorMessage(new Error('x'.repeat(241)), 'Não foi possível concluir.')).toBe('Não foi possível concluir.')
  })

  it('uses the fallback for non-Error values', () => {
    expect(userFacingErrorMessage({ message: 'falha' }, 'Não foi possível concluir.')).toBe('Não foi possível concluir.')
  })
})
