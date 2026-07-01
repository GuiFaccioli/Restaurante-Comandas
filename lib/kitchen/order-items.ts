export type KitchenOrderItem = {
  nome: string
  quantidade: number
  observacao?: string | null
  categoriaNome?: string | null
}

export type KitchenOrderItemGroup = {
  category: string
  items: KitchenOrderItem[]
}

const KITCHEN_CATEGORY_ORDER = ['Cozinha', 'Pizzas', 'Bebidas']

export function groupKitchenItemsByCategory(items: KitchenOrderItem[]): KitchenOrderItemGroup[] {
  const groups = new Map<string, KitchenOrderItem[]>()

  for (const item of items) {
    const category = item.categoriaNome?.trim() || 'Outros'
    groups.set(category, [...(groups.get(category) ?? []), item])
  }

  const knownGroups = KITCHEN_CATEGORY_ORDER.flatMap((category) => {
    const categoryItems = groups.get(category)
    return categoryItems?.length ? [{ category, items: categoryItems }] : []
  })

  const unknownGroups = Array.from(groups.entries())
    .filter(([category]) => !KITCHEN_CATEGORY_ORDER.includes(category))
    .map(([category, categoryItems]) => ({ category, items: categoryItems }))

  return [...knownGroups, ...unknownGroups]
}
