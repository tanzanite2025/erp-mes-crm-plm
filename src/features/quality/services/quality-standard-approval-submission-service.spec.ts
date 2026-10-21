import { describe, expect, it, vi } from 'vitest'
import { createDefaultStandard } from '../adapters/quality-standard-api-adapter'
import type { Standard } from '../data/schema'
import { submitQualityStandardWithConfirmedApprovalRequest } from './quality-standard-approval-submission-service'

describe('quality standard submission uses the server transaction result', () => {
  it('returns the current committed approval without a second request or client dispatch', async () => {
    const standard: Standard = {
      ...createDefaultStandard(),
      id: 'standard',
      status: 'PENDING_APPROVAL',
      approvalRequestSummary: {
        id: 'current-approval',
        requesterId: 'requester',
        reason: 'Review',
        currentLevel: 1,
        status: 'PENDING',
        module: 'Quality',
        action: 'STANDARD_REVIEW',
        createdAt: '2026-10-20T00:00:00Z',
      },
    }
    const savePendingStandard = vi.fn(async () => standard)
    const result = await submitQualityStandardWithConfirmedApprovalRequest({
      savePendingStandard,
    })
    expect(result.standard).toBe(standard)
    expect(savePendingStandard).toHaveBeenCalledTimes(1)
  })

  it.each(['missing', 'historical'] as const)(
    'does not confirm a %s approval record',
    async (kind) => {
      const standard: Standard = {
        ...createDefaultStandard(),
        status: 'PENDING_APPROVAL',
        approvalRequestSummary:
          kind === 'missing'
            ? undefined
            : {
                id: 'old-approval',
                requesterId: 'requester',
                reason: 'Old review',
                currentLevel: 1,
                status: 'REJECTED',
                module: 'Quality',
                action: 'STANDARD_REVIEW',
                createdAt: '2026-10-19T00:00:00Z',
              },
      }
      await expect(
        submitQualityStandardWithConfirmedApprovalRequest({
          savePendingStandard: async () => standard,
        })
      ).rejects.toThrow()
    }
  )

  it('propagates a failed server transaction without retrying the save', async () => {
    const failure = new Error('No configured approval chain')
    const savePendingStandard = vi.fn().mockRejectedValue(failure)
    await expect(
      submitQualityStandardWithConfirmedApprovalRequest({ savePendingStandard })
    ).rejects.toBe(failure)
    expect(savePendingStandard).toHaveBeenCalledTimes(1)
  })
})
