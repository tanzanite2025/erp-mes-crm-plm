import { describe, expect, it } from 'vitest'
import { createDefaultStandard } from '../adapters/quality-standard-api-adapter'
import type { Standard } from '../data/schema'
import { buildQualityStandardListItemPresenter } from './quality-standard-list-presenter'

describe('quality standard approval request evidence', () => {
  const context: Parameters<typeof buildQualityStandardListItemPresenter>[1] = {
    t: (key) => key,
    locale: 'zh-CN',
  }

  it.each<Standard['status']>([
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'PUBLISHED',
    'ARCHIVED',
  ])(
    'does not infer an approval request from status %s or save metadata',
    (status) => {
      const presenter = buildQualityStandardListItemPresenter(
        {
          ...createDefaultStandard(),
          status,
          auditor: 'admin',
          auditTime: '2026-10-19T09:47:17.179376Z',
          reviewComment: 'Saved information',
          rejectReason: 'Old reason',
          archiveReason: 'Archive reason',
        },
        context
      )
      expect(presenter.hasApprovalRequest).toBe(false)
      expect(presenter.approvalRequestLabel).toBe('未生成审批申请')
    }
  )

  it('shows a created approval request only when the server returns an actual request ID', () => {
    const standard = createDefaultStandard()
    standard.approvalRequestSummary = {
      id: 'actual-request',
      requesterId: 'requester',
      reason: 'Review this standard',
      currentLevel: 1,
      status: 'PENDING',
      module: 'Quality',
      action: 'STANDARD_REVIEW',
      createdAt: '2026-10-19T09:47:17.179376Z',
    }
    const presenter = buildQualityStandardListItemPresenter(standard, context)
    expect(presenter.hasApprovalRequest).toBe(true)
    expect(presenter.approvalRequestLabel).toBe('已生成审批申请')
    expect(presenter.processSummaryLabel).toBe('审批请求待处理')
  })

  it('does not present the draft save actor and timestamp as a review decision', () => {
    const presenter = buildQualityStandardListItemPresenter(
      {
        ...createDefaultStandard(),
        status: 'DRAFT',
        auditor: 'admin',
        auditTime: '2026-10-19T09:47:17.179376Z',
      },
      context
    )
    expect(presenter.reviewerName).toBeUndefined()
    expect(presenter.decisionActor).toBeUndefined()
    expect(presenter.decisionTimestampText).toBeUndefined()
  })
})
