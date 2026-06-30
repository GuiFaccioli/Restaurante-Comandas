import { describe, expect, it } from 'vitest'
import { formatCurrencyInput, normalizeCurrencyToDecimal } from '@/lib/money'

describe('money formatting', () => {
  it.each([
    ['5', '0,05'],
    ['500', '5,00'],
    ['5,00', '5,00'],
    ['R$ 1.234,56', '1.234,56'],
    ['123456', '1.234,56'],
  ])('formats %s while typing as %s', (input, expected) => {
    expect(formatCurrencyInput(input)).toBe(expected)
  })

  it.each([
    ['5', '5.00'],
    ['500', '500.00'],
    ['5,00', '5.00'],
    ['5.00', '5.00'],
    ['1.234,56', '1234.56'],
    ['R$ 1.234,56', '1234.56'],
  ])('normalizes %s to database decimal %s', (input, expected) => {
    expect(normalizeCurrencyToDecimal(input)).toBe(expected)
  })

  it('rejects empty or zero money values', () => {
    expect(() => normalizeCurrencyToDecimal('')).toThrow('Informe um preço válido')
    expect(() => normalizeCurrencyToDecimal('0,00')).toThrow('Informe um preço válido')
  })
})

