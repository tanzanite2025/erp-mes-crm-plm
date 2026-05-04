import { describe, expect, it } from 'vitest'
import {
  buildBusinessEventPhaseOptions,
  deserializeBusinessEventPhaseCatalog,
} from './business-event-phase-catalog'

describe('business-event-phase-catalog', () => {
  it('deserializes and sorts the backend phase catalog by order', () => {
    const result = deserializeBusinessEventPhaseCatalog([
      { code: 'active', label: '进行中', semantic: 'active', order: 3 },
      { code: 'draft', label: '草稿', semantic: 'draft', order: 0 },
    ])

    expect(result).toEqual([
      { code: 'draft', label: '草稿', semantic: 'draft', order: 0 },
      { code: 'active', label: '进行中', semantic: 'active', order: 3 },
    ])
  })

  it('keeps unknown status phases selectable by degrading them into custom semantic options', () => {
    const catalog = deserializeBusinessEventPhaseCatalog([
      { code: 'draft', label: '草稿', semantic: 'draft', order: 0 },
      { code: 'pending', label: '待处理', semantic: 'pending', order: 1 },
    ])

    const options = buildBusinessEventPhaseOptions(catalog, [
      { phase: 'pending' },
      { phase: 'reviewing' },
    ])

    expect(options).toEqual([
      { value: 'draft', label: '草稿', semantic: 'draft', known: true },
      { value: 'pending', label: '待处理', semantic: 'pending', known: true },
      {
        value: 'reviewing',
        label: 'reviewing（未注册）',
        semantic: 'custom',
        known: false,
      },
    ])
  })
})
