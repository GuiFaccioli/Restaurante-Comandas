export type RecipeCostItem = {
  quantidade: string | number
  custoUnitario: string | number | null
}

export type RecipeCostResult = {
  custoTotal: number | null
  margemPercentual: number | null
  lucroBruto: number | null
  possuiFicha: boolean
  possuiIngredienteSemCusto: boolean
}

function numberValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : Number(value.replace(',', '.'))
}

export function calcularCustoMedioPonderado(
  estoqueAtual: string | number,
  custoAtual: string | number | null,
  quantidadeEntrada: string | number,
  custoUnitarioEntrada: string | number,
): number {
  const estoque = numberValue(estoqueAtual)
  const custo = numberValue(custoAtual)
  const entrada = numberValue(quantidadeEntrada)
  const custoEntrada = numberValue(custoUnitarioEntrada)
  if (entrada <= 0) throw new Error('A quantidade de entrada deve ser maior que zero')
  if (custoEntrada < 0) throw new Error('O custo de entrada não pode ser negativo')
  if (estoque <= 0 || custoAtual === null) return custoEntrada
  return ((estoque * custo) + (entrada * custoEntrada)) / (estoque + entrada)
}

export function calcularCustoFicha(
  items: RecipeCostItem[],
  precoVenda: string | number | null,
): RecipeCostResult {
  const possuiFicha = items.length > 0
  const possuiIngredienteSemCusto = items.some((item) => item.custoUnitario === null)
  if (!possuiFicha || possuiIngredienteSemCusto) {
    return {
      custoTotal: null,
      margemPercentual: null,
      lucroBruto: null,
      possuiFicha,
      possuiIngredienteSemCusto,
    }
  }

  const custoTotal = items.reduce(
    (total, item) => total + numberValue(item.quantidade) * numberValue(item.custoUnitario),
    0,
  )
  const preco = numberValue(precoVenda)
  const lucroBruto = preco - custoTotal
  return {
    custoTotal,
    margemPercentual: preco > 0 ? (lucroBruto / preco) * 100 : null,
    lucroBruto,
    possuiFicha,
    possuiIngredienteSemCusto,
  }
}
