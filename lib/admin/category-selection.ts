type CategoryIdentity = { id: string }

export function nextCategoryIdAfterDeletion(
  categories: CategoryIdentity[],
  deletedId: string,
  currentId: string
): string {
  if (currentId !== deletedId) return currentId

  const index = categories.findIndex((category) => category.id === deletedId)
  if (index < 0) return categories[0]?.id ?? ''
  return categories[index + 1]?.id ?? categories[index - 1]?.id ?? ''
}
