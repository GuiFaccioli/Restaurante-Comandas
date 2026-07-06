export function calculateOrderTotal(
  items: Array<{ quantidade: number; precoUnitario: string }>
): number {
  return items.reduce((total, item) => {
    return total + item.quantidade * Number(item.precoUnitario)
  }, 0)
}
