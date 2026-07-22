import { describe, expect, it } from 'vitest'
import { calcularCustoFicha, calcularCustoMedioPonderado } from '@/lib/stock/costing'

describe('stock costing', () => {
  it('calculates weighted average cost for a new entry', () => {
    expect(calcularCustoMedioPonderado('100', '0.03', '200', '0.05')).toBeCloseTo(0.043333, 6)
  })

  it('uses the entry cost when there is no valued stock yet', () => {
    expect(calcularCustoMedioPonderado('0', null, '1000', '0.048')).toBe(0.048)
  })

  it('calculates recipe cost and gross margin', () => {
    const result = calcularCustoFicha([
      { quantidade: '150', custoUnitario: '0.03' },
      { quantidade: '30', custoUnitario: '0.05' },
    ], '28')

    expect(result.custoTotal).toBeCloseTo(6, 6)
    expect(result.lucroBruto).toBeCloseTo(22, 6)
    expect(result.margemPercentual).toBeCloseTo(78.5714, 4)
  })

  it('does not invent cost or margin for incomplete recipes or zero price', () => {
    expect(calcularCustoFicha([], '28').custoTotal).toBeNull()
    expect(calcularCustoFicha([{ quantidade: 1, custoUnitario: null }], '28').margemPercentual).toBeNull()
    expect(calcularCustoFicha([{ quantidade: 1, custoUnitario: 2 }], '0').margemPercentual).toBeNull()
  })
})
