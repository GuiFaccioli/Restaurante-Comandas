export type ReplenishmentCandidate = {
  id: string
  nome: string
  unidadeBase: string
  unidadeCompra: string
  fatorCompraParaBase: string
  estoqueAtual: string
  estoqueMinimo: string | null
  estoqueIdeal: string | null
  ativo: boolean
}

export type ReplenishmentItem = ReplenishmentCandidate & {
  quantidadeSugeridaBase: number | null
  quantidadeSugeridaCompra: number | null
  status: 'sem_estoque' | 'estoque_baixo'
}

export function getReplenishmentItems(
  items: ReplenishmentCandidate[],
): ReplenishmentItem[] {
  return items
    .filter((item) => item.ativo && item.estoqueMinimo !== null)
    .filter((item) => Number(item.estoqueAtual) <= Number(item.estoqueMinimo))
    .map((item) => {
      const current = Number(item.estoqueAtual)
      const ideal = item.estoqueIdeal === null ? null : Number(item.estoqueIdeal)
      const suggestedBase = ideal === null ? null : Math.max(ideal - current, 0)
      const factor = Number(item.fatorCompraParaBase)
      return {
        ...item,
        quantidadeSugeridaBase: suggestedBase,
        quantidadeSugeridaCompra: suggestedBase === null ? null : suggestedBase / factor,
        status: current <= 0 ? 'sem_estoque' : 'estoque_baixo',
      }
    })
}

export function getStockStatus(item: Pick<ReplenishmentCandidate, 'estoqueAtual' | 'estoqueMinimo' | 'ativo'>) {
  if (!item.ativo) return 'inativo' as const
  if (item.estoqueMinimo === null) return 'sem_controle' as const
  if (Number(item.estoqueAtual) <= 0) return 'sem_estoque' as const
  if (Number(item.estoqueAtual) <= Number(item.estoqueMinimo)) {
    return 'estoque_baixo' as const
  }
  return 'estoque_normal' as const
}
