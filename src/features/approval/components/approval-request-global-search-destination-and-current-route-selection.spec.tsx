// @vitest-environment jsdom
import { Route as ApprovalRequestsRoute } from '@/routes/_authenticated/approval/requests'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalRequest } from '../services/approval-service'
import { ApprovalRequests } from '../tabs/approval-requests'

const approvalSearchDestinationTestState = vi.hoisted(() => ({
  routeSearch: {} as { requestId?: string },
  getMyApprovals: vi.fn(),
}))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useSearch: () => approvalSearchDestinationTestState.routeSearch,
}))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key, locale: 'zh-CN' }),
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({ allowsAction: () => false }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: { user: { id: string } }) => unknown) =>
    select({ user: { id: 'current-approver' } }),
}))
vi.mock('../services/approval-service', () => ({
  ApprovalService: {
    getMyApprovals: approvalSearchDestinationTestState.getMyApprovals,
  },
}))

function createHistoricalApprovalRequestForSearchDestinationTests(
  id: string
): ApprovalRequest {
  return {
    id,
    requesterId: 'another-requester',
    approver1Id: 'current-approver',
    currentLevel: 2,
    status: 'APPROVED',
    targetId: `TARGET-${id}`,
    reason: `Reason for ${id}`,
    module: 'Trading',
    action: 'delete',
    createdAt: '2026-10-24T00:00:00Z',
  }
}

describe('approval result destination and route selection', () => {
  beforeEach(() => {
    approvalSearchDestinationTestState.routeSearch = { requestId: 'request-a' }
    approvalSearchDestinationTestState.getMyApprovals.mockReset()
    approvalSearchDestinationTestState.getMyApprovals.mockResolvedValue([
      createHistoricalApprovalRequestForSearchDestinationTests('request-a'),
      createHistoricalApprovalRequestForSearchDestinationTests('request-b'),
    ])
  })
  afterEach(cleanup)

  it('preserves the search result requestId and rejects non-string route values', () => {
    const validateSearch = ApprovalRequestsRoute.options.validateSearch
    expect(typeof validateSearch).toBe('function')
    if (typeof validateSearch !== 'function')
      throw new Error('Missing approval search validator')
    expect(validateSearch({ requestId: 'request-a' })).toEqual({
      requestId: 'request-a',
    })
    expect(validateSearch({ requestId: ['request-a'] })).toEqual({
      requestId: undefined,
    })
  })

  it('shows the selected historical approval and follows navigation on the mounted page', async () => {
    const view = render(<ApprovalRequests />)
    const selected = await screen.findByLabelText(
      'approval.requests.selectedRequest'
    )
    expect(
      within(selected).getByText('Reason for request-a')
    ).toBeInTheDocument()
    expect(
      within(selected).getByText('ID: TARGET-request-a')
    ).toBeInTheDocument()
    approvalSearchDestinationTestState.routeSearch = { requestId: 'request-b' }
    view.rerender(<ApprovalRequests />)
    expect(
      within(selected).getByText('Reason for request-b')
    ).toBeInTheDocument()
    expect(
      within(selected).queryByText('Reason for request-a')
    ).not.toBeInTheDocument()
    approvalSearchDestinationTestState.routeSearch = {}
    view.rerender(<ApprovalRequests />)
    expect(
      screen.queryByLabelText('approval.requests.selectedRequest')
    ).not.toBeInTheDocument()
  })

  it('reports when a selected request is no longer in the accessible list', async () => {
    approvalSearchDestinationTestState.getMyApprovals.mockResolvedValue([])
    render(<ApprovalRequests />)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'approval.requests.selectedUnavailable'
    )
  })

  it('distinguishes a failed read from an unavailable selected request', async () => {
    approvalSearchDestinationTestState.getMyApprovals.mockRejectedValue(
      new Error('network failed')
    )
    render(<ApprovalRequests />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'approval.requests.selectedLoadFailed'
    )
    expect(
      screen.queryByText('approval.requests.selectedUnavailable')
    ).not.toBeInTheDocument()
  })
})
