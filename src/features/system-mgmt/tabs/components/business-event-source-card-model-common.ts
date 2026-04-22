export function moveBusinessEventConfigItem<T>(
  items: T[],
  from: number,
  to: number
) {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function updateBusinessEventConfigItemAt<T>(
  items: T[],
  index: number,
  updates: Partial<T>
): T[] {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...updates } : item
  )
}

export function removeBusinessEventConfigItemAt<T>(
  items: T[],
  index: number
): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index)
}

export function restoreBusinessEventConfigItem<
  T extends {
    id?: string
    order?: number
  },
>(items: T[], item: T): T[] {
  if (item.id && items.some((currentItem) => currentItem.id === item.id)) {
    return items
  }

  const nextItems = [...items]
  const targetIndex = Math.max(
    0,
    Math.min(item.order ?? nextItems.length, nextItems.length)
  )
  nextItems.splice(targetIndex, 0, { ...item })
  return nextItems
}
