export type ReceitaDisponibilidade = { produtoId: string; itemEstoqueId: string; quantidade: string }
export type SaldoItemEstoque = { id: string; estoqueAtual: string }

export function produtoTemEstoque(produtoId: string, receitas: ReceitaDisponibilidade[], saldos: SaldoItemEstoque[]): boolean {
  const saldoPorItemEstoque = new Map(saldos.map((item) => [item.id, Number(item.estoqueAtual)]))
  return receitas.filter((item) => item.produtoId === produtoId).every((item) => (saldoPorItemEstoque.get(item.itemEstoqueId) ?? 0) >= Number(item.quantidade))
}
