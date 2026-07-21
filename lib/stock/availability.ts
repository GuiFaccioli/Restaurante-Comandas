export type ReceitaDisponibilidade = { produtoId: string; insumoId: string; quantidade: string }
export type SaldoInsumo = { id: string; estoqueAtual: string }

export function produtoTemEstoque(produtoId: string, receitas: ReceitaDisponibilidade[], saldos: SaldoInsumo[]): boolean {
  const saldoPorInsumo = new Map(saldos.map((item) => [item.id, Number(item.estoqueAtual)]))
  return receitas.filter((item) => item.produtoId === produtoId).every((item) => (saldoPorInsumo.get(item.insumoId) ?? 0) >= Number(item.quantidade))
}
