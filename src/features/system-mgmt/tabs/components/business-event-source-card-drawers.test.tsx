// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatusEditorContent } from './business-event-source-card-drawers'
import { type BusinessEventStatusReferenceSummary } from './business-event-source-status-references'

function createReferenceSummary(
  overrides: Partial<BusinessEventStatusReferenceSummary> = {}
): BusinessEventStatusReferenceSummary {
  return {
    code: 'Pending',
    targetSegmentCount: 0,
    resolveSegmentCount: 0,
    approvalActionCount: 0,
    referencedRuleCount: 0,
    referencedRuleNames: [],
    referencedSegmentTitles: [],
    isReferenced: false,
    ...overrides,
  }
}

describe('StatusEditorContent reference guardrails', () => {
  it('disables delete for persisted statuses that are already referenced', () => {
    const onDelete = vi.fn()

    render(
      <StatusEditorContent
        statuses={[{ id: 'status-1', code: 'Pending', order: 0 }]}
        sourceCode='SALES_ORDER'
        persistedStatusIds={new Set(['status-1'])}
        statusReferenceMap={
          new Map([
            [
              'Pending',
              createReferenceSummary({
                targetSegmentCount: 1,
                referencedRuleCount: 1,
                referencedRuleNames: ['销售订单待处理规则'],
                referencedSegmentTitles: ['待处理阶段'],
                isReferenced: true,
              }),
            ],
          ])
        }
        statusReferencesLoaded
        onAdd={() => undefined}
        onUpdate={() => undefined}
        onMove={() => undefined}
        onDelete={onDelete}
        onClose={() => undefined}
      />
    )

    const deleteButton = screen
      .getAllByRole('button', { name: '删除状态' })
      .find((button) => (button as HTMLButtonElement).disabled)
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText('已引用')).not.toBeNull()
    expect(screen.queryByText('规则占用：触发 1')).not.toBeNull()
  })

  it('requires confirmation before deleting a persisted but unreferenced status', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <StatusEditorContent
        statuses={[{ id: 'status-1', code: 'Pending', order: 0 }]}
        sourceCode='SALES_ORDER'
        persistedStatusIds={new Set(['status-1'])}
        statusReferenceMap={
          new Map([
            ['Pending', createReferenceSummary({ isReferenced: false })],
          ])
        }
        statusReferencesLoaded
        onAdd={() => undefined}
        onUpdate={() => undefined}
        onMove={() => undefined}
        onDelete={onDelete}
        onClose={() => undefined}
      />
    )

    const deleteButton = screen
      .getAllByRole('button', { name: '删除状态' })
      .find((button) => !(button as HTMLButtonElement).disabled)

    await user.click(deleteButton as HTMLButtonElement)
    expect(screen.queryByText('删除已落库状态')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: '确认删除' }))
    expect(onDelete).toHaveBeenCalledWith(0)
  })
})
