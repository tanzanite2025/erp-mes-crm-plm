import { describe, expect, it } from 'vitest'
import { getSearchItems } from './search-data'

const t = (key: string) => key

describe('getSearchItems', () => {
  it('points approval center command search to the unified message center entry', () => {
    const items = getSearchItems(t as never)
    const approvalCenter = items.find(
      (item) => item.id === 'action-approval-center'
    )

    expect(approvalCenter).toBeDefined()
    expect(approvalCenter?.href).toBe('/approval/routing')
    expect(approvalCenter?.keywords).toEqual(
      expect.arrayContaining(['消息中心', 'approval', 'routing'])
    )
  })
})
