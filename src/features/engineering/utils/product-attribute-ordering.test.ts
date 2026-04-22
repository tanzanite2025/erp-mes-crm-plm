import { describe, expect, it } from 'vitest'
import {
  dropProductAttributeItemToTarget,
  moveProductAttributeItem,
  toProductAttributeOrderedIds,
} from './product-attribute-ordering'

const items = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
]

describe('product attribute ordering', () => {
  it('moves an item up or down without mutating the original list', () => {
    expect(toProductAttributeOrderedIds(moveProductAttributeItem(items, 'b', 'up') ?? [])).toEqual(['b', 'a', 'c'])
    expect(toProductAttributeOrderedIds(moveProductAttributeItem(items, 'b', 'down') ?? [])).toEqual(['a', 'c', 'b'])
    expect(toProductAttributeOrderedIds(items)).toEqual(['a', 'b', 'c'])
  })

  it('drops an item after a lower target and before an upper target', () => {
    expect(toProductAttributeOrderedIds(dropProductAttributeItemToTarget(items, 'a', 'c') ?? [])).toEqual(['b', 'c', 'a'])
    expect(toProductAttributeOrderedIds(dropProductAttributeItemToTarget(items, 'c', 'a') ?? [])).toEqual(['c', 'a', 'b'])
  })
})
