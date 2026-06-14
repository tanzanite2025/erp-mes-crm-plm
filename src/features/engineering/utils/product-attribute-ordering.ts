export interface ProductAttributeOrderedItem {
  id: string
}

export function moveProductAttributeItem<T extends ProductAttributeOrderedItem>(
  items: T[],
  id: string,
  direction: 'up' | 'down'
): T[] | null {
  const currentIndex = items.findIndex((item) => item.id === id)
  if (currentIndex < 0) return null

  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (nextIndex < 0 || nextIndex >= items.length) return null

  const nextItems = [...items]
  const [item] = nextItems.splice(currentIndex, 1)
  nextItems.splice(nextIndex, 0, item)
  return nextItems
}

export function dropProductAttributeItemToTarget<
  T extends ProductAttributeOrderedItem,
>(items: T[], sourceId: string, targetId: string): T[] | null {
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex)
    return null

  const nextItems = [...items]
  const [sourceItem] = nextItems.splice(sourceIndex, 1)
  const insertionIndex = nextItems.findIndex((item) => item.id === targetId)
  const adjustedInsertionIndex =
    sourceIndex < targetIndex ? insertionIndex + 1 : insertionIndex
  nextItems.splice(
    insertionIndex < 0 ? nextItems.length : adjustedInsertionIndex,
    0,
    sourceItem
  )
  return nextItems
}

export function toProductAttributeOrderedIds<
  T extends ProductAttributeOrderedItem,
>(items: T[]): string[] {
  return items.map((item) => item.id)
}
