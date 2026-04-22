import { describe, expect, it } from 'vitest'
import {
  applyLogisticsTemplate,
  createEmptyLogisticsProvider,
} from './provider-directory.domain'

describe('provider-directory.domain', () => {
  it('applies template managed fields while preserving manually authored contact and note', () => {
    const draft = createEmptyLogisticsProvider()
    draft.contact = '自有对接人'
    draft.note = '已有人工备注'

    const provider = applyLogisticsTemplate(draft, 'SF')

    expect(provider.name).toBe('顺丰速运 (SF Express)')
    expect(provider.code).toBe('SF')
    expect(provider.category).toBe('domestic')
    expect(provider.website).toBe('https://www.sf-express.com')
    expect(provider.contact).toBe('自有对接人')
    expect(provider.note).toBe('已有人工备注')
    expect(provider.endpoint).toBe('https://bspgw.sf-express.com/std/service')
    expect(provider.capabilities).toEqual(['tracking', 'callback', 'label', 'order_create'])
  })
})
