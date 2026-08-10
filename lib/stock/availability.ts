export type ReceitaDisponibilidade = { produtoId: string; insumoId: string; quantidade: string }
export type SaldoInsumo = { id: string; estoqueAtual: string }

export type SaldoDisponibilidade = SaldoInsumo & { nome: string }
export type ProdutoControleEstoque = { id: string; controleEstoque: boolean }

export function getProductAvailability(
  produtoId: string,
  cartItems: Array<{ produtoId: string; quantidade: number }>,
  recipes: ReceitaDisponibilidade[],
  balances: SaldoDisponibilidade[],
  productStockControls: ProdutoControleEstoque[] = [],
): { maxAdditionalQuantity: number | null; limitingItemName: string | null } {
  const stockControlByProduct = new Map(productStockControls.map((product) => [product.id, product.controleEstoque]))
  if (stockControlByProduct.get(produtoId) === false) {
    return { maxAdditionalQuantity: null, limitingItemName: null }
  }

  const productRecipes = recipes.filter((recipe) => recipe.produtoId === produtoId)
  if (productRecipes.length === 0) {
    return { maxAdditionalQuantity: null, limitingItemName: null }
  }

  const demandByItem = new Map<string, number>()
  for (const cartItem of cartItems) {
    if (stockControlByProduct.get(cartItem.produtoId) === false) continue
    for (const recipe of recipes) {
      if (recipe.produtoId !== cartItem.produtoId) continue
      demandByItem.set(
        recipe.insumoId,
        (demandByItem.get(recipe.insumoId) ?? 0) + Number(recipe.quantidade) * cartItem.quantidade,
      )
    }
  }

  const requirementByItem = new Map<string, number>()
  for (const recipe of productRecipes) {
    requirementByItem.set(
      recipe.insumoId,
      (requirementByItem.get(recipe.insumoId) ?? 0) + Number(recipe.quantidade),
    )
  }

  const balanceByItem = new Map(balances.map((balance) => [balance.id, balance]))
  let maxAdditionalQuantity = Infinity
  let limitingItemName: string | null = null

  for (const [insumoId, requirement] of requirementByItem) {
    const balance = balanceByItem.get(insumoId)
    const remaining = (balance ? Number(balance.estoqueAtual) : 0) - (demandByItem.get(insumoId) ?? 0)
    const candidate = Math.max(0, Math.floor(remaining / requirement))
    if (candidate < maxAdditionalQuantity) {
      maxAdditionalQuantity = candidate
      limitingItemName = balance?.nome ?? null
    }
  }

  return { maxAdditionalQuantity, limitingItemName }
}

export function produtoTemEstoque(produtoId: string, receitas: ReceitaDisponibilidade[], saldos: SaldoInsumo[]): boolean {
  const namedBalances = saldos.map((balance) => ({ ...balance, nome: '' }))
  const availability = getProductAvailability(produtoId, [], receitas, namedBalances)
  return availability.maxAdditionalQuantity === null || availability.maxAdditionalQuantity > 0
}
