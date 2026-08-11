export const UNIDADES_BASE = ['g', 'ml', 'unidade'] as const
export const UNIDADES_COMPRA = ['g', 'kg', 'ml', 'l', 'unidade'] as const
export type UnidadeBase = (typeof UNIDADES_BASE)[number]
export type UnidadeCompra = (typeof UNIDADES_COMPRA)[number]

const UNIT_FACTORS: Record<UnidadeCompra, number> = { g: 1, kg: 1000, ml: 1, l: 1000, unidade: 1 }
const UNIT_FAMILIES: Record<UnidadeCompra, 'peso' | 'volume' | 'contagem'> = { g: 'peso', kg: 'peso', ml: 'volume', l: 'volume', unidade: 'contagem' }

export function unidadesCompativeis(first: string, second: string): boolean {
  if (
    !UNIDADES_COMPRA.includes(first as UnidadeCompra)
    || !UNIDADES_COMPRA.includes(second as UnidadeCompra)
  ) return false
  return UNIT_FAMILIES[first as UnidadeCompra]
    === UNIT_FAMILIES[second as UnidadeCompra]
}

export function movementUnitsFor(unidadeBase: string): UnidadeCompra[] {
  if (unidadeBase === 'g') return ['g', 'kg']
  if (unidadeBase === 'ml') return ['ml', 'l']
  if (unidadeBase === 'unidade') return ['unidade']
  throw new Error('Unidade de estoque inválida')
}

function parseDecimal(value: string | undefined, label: string, allowZero = true): number {
  const parsed = Number((value ?? '0').replace(',', '.'))
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) throw new Error(`${label} inválido`)
  return parsed
}

function assertUnits(base: string, purchase: string): asserts base is UnidadeBase {
  if (!UNIDADES_BASE.includes(base as UnidadeBase) || !UNIDADES_COMPRA.includes(purchase as UnidadeCompra)) throw new Error('Unidade de estoque inválida')
  if (!unidadesCompativeis(base, purchase)) throw new Error('As unidades de compra e estoque precisam ser compatíveis')
}

export function normalizarQuantidadeBase(quantidade: string, unidadeCompra: string, unidadeBase: string): string {
  assertUnits(unidadeBase, unidadeCompra)
  const amount = parseDecimal(quantidade, 'Quantidade')
  const factor = UNIT_FACTORS[unidadeCompra as UnidadeCompra] / UNIT_FACTORS[unidadeBase as UnidadeCompra]
  return (amount * factor).toFixed(3)
}

export function quantidadeBaseParaUnidade(
  quantidadeBase: string,
  unidadeCompra: string,
  unidadeBase: string,
): string {
  assertUnits(unidadeBase, unidadeCompra)
  const amount = parseDecimal(quantidadeBase, 'Quantidade')
  const factor = UNIT_FACTORS[unidadeCompra as UnidadeCompra]
    / UNIT_FACTORS[unidadeBase as UnidadeCompra]
  const converted = amount / factor
  const decimalPlaces = factor > 1 ? 6 : 3
  return converted
    .toFixed(decimalPlaces)
    .replace(/0+$/, '')
    .replace(/\.$/, '')
}

export function fatorCompraParaBase(unidadeCompra: UnidadeCompra, unidadeBase: UnidadeBase): string {
  return (UNIT_FACTORS[unidadeCompra] / UNIT_FACTORS[unidadeBase]).toFixed(3)
}

export function parsePositiveDecimal(value: string, label: string): number {
  return parseDecimal(value, label, false)
}
