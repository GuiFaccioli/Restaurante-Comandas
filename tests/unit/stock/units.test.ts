import { describe, expect, it } from 'vitest'
import { formatStockQuantity } from '@/lib/stock/units'

describe('formatStockQuantity', () => {
  it('converts grams to kilograms at the threshold', () => {
    expect(formatStockQuantity('999', 'g')).toBe('999 g')
    expect(formatStockQuantity('1000', 'g')).toBe('1 kg')
    expect(formatStockQuantity('1200', 'g')).toBe('1.2 kg')
  })

  it('converts milliliters to liters at the threshold', () => {
    expect(formatStockQuantity('1000', 'ml')).toBe('1 l')
    expect(formatStockQuantity('1250', 'ml')).toBe('1.25 l')
  })

  it('keeps counts and small base quantities unchanged', () => {
    expect(formatStockQuantity('2', 'unidade')).toBe('2 unidade')
    expect(formatStockQuantity('-1200', 'g')).toBe('-1.2 kg')
  })
})
