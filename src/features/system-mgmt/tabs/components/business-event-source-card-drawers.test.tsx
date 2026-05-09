// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusEditorContent } from './business-event-source-card-drawers'
import { type BusinessEventStatusReferenceSummary } from './business-event-source-status-references'
import { type BusinessEventStatusRenameBatchAnalysis } from './business-event-source-status-safe-rename'

afterEach(() => {
  cleanup()
})

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

function createBatchAnalysis(
  overrides: Partial<BusinessEventStatusRenameBatchAnalysis> = {}
): BusinessEventStatusRenameBatchAnalysis {
  return {
    blockers: [],
    swapPairs: [],
    chainPaths: [],
    semanticShrinkImpacts: [],
    hasBlockers: false,
    hasWarnings: false,
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

  it('disables save when batch rename blocker exists', () => {
    render(
      <StatusEditorContent
        statuses={[{ id: 'status-1', code: 'Pending', order: 0 }]}
        sourceCode='SALES_ORDER'
        persistedStatusIds={new Set(['status-1'])}
        statusReferenceMap={new Map([['Pending', createReferenceSummary()]])}
        statusRenameBatchAnalysis={
          createBatchAnalysis({
            blockers: [
              {
                type: 'merge_rename',
                codes: ['Pending', 'Queued'],
                nextCode: 'HOLD',
              },
            ],
            hasBlockers: true,
          })
        }
        statusReferencesLoaded
        onAdd={() => undefined}
        onUpdate={() => undefined}
        onMove={() => undefined}
        onDelete={() => undefined}
        onClose={() => undefined}
        onSave={() => undefined}
      />
    )

    expect(screen.queryByText('批量阻断：Pending / Queued 将汇聚到 HOLD')).not.toBeNull()
    const saveButton = screen
      .getAllByRole('button', { name: '保存状态' })
      .find((button) => (button as HTMLButtonElement).disabled)
    expect((saveButton as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows batch warning details in rename confirmation dialog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <StatusEditorContent
        statuses={[{ id: 'status-1', code: 'Queued', order: 0 }]}
        sourceCode='SALES_ORDER'
        persistedStatusIds={new Set(['status-1'])}
        committedStatusCodeMap={new Map([['status-1', 'Pending']])}
        statusReferenceMap={new Map([['Pending', createReferenceSummary()]])}
        statusRenamePlans={[
          {
            statusId: 'status-1',
            oldCode: 'Pending',
            nextCode: 'Queued',
            targetSegmentCount: 1,
            resolveSegmentCount: 0,
            derivedApprovalActionCount: 1,
            blockers: [],
            canSafelyRename: true,
          },
        ]}
        statusRenameBatchAnalysis={
          createBatchAnalysis({
            swapPairs: [{ leftCode: 'Pending', rightCode: 'Queued' }],
            chainPaths: [{ codes: ['Draft', 'Review', 'Approved'] }],
            semanticShrinkImpacts: [
              {
                ruleId: 'rule-1',
                ruleName: '销售订单待处理规则',
                segmentId: 'segment-1',
                segmentTitle: '待处理阶段',
                field: 'targetStatuses',
                beforeValues: ['Pending', 'Queued'],
                afterValues: ['Queued'],
              },
            ],
            hasWarnings: true,
          })
        }
        statusReferencesLoaded
        onAdd={() => undefined}
        onUpdate={() => undefined}
        onMove={() => undefined}
        onDelete={() => undefined}
        onClose={() => undefined}
        onSave={onSave}
      />
    )

    const saveButton = screen
      .getAllByRole('button', { name: '保存状态' })
      .find((button) => !(button as HTMLButtonElement).disabled)

    await user.click(saveButton as HTMLButtonElement)
    expect(await screen.findByText('确认安全重命名迁移')).not.toBeNull()
    expect(await screen.findByText(/交换改名 1 组/)).not.toBeNull()
    expect(await screen.findByText(/链式改名 1 组/)).not.toBeNull()
    expect(await screen.findByText(/1 个规则字段会发生语义收缩/)).not.toBeNull()

    await user.click(screen.getByRole('button', { name: '确认迁移并保存' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
