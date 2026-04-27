import { apiFetch } from '@/lib/api-client'

export interface ApprovalUserOption {
  id: string
  username: string
  employeeId?: string
  firstName?: string
  lastName?: string
  status?: string
}

export interface ApprovalUserRef {
  id: string
  username?: string
  firstName?: string
  lastName?: string
}

export interface ApprovalRequest {
  id: string
  requesterId: string
  requester?: ApprovalUserRef
  targetId: string
  reason: string
  approver1Id?: string
  approver2Id?: string
  currentLevel: number
  status:
    | 'PENDING'
    | 'APPROVED_L1'
    | 'APPROVED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'CONSUMED'
  authCode?: string
  expiresAt?: string
  module: string
  action: string
  createdAt: string
  delta?: unknown
  targetVersion?: number
}

export const ApprovalService = {
  fetchUserOptions: () => apiFetch<ApprovalUserOption[]>('/users?options=true'),

  requestApproval: (data: {
    module: string
    action: string
    targetId: string
    reason: string
    approver1Id?: string
    approver2Id?: string
  }) =>
    apiFetch<ApprovalRequest>('/approvals/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyApprovals: () => apiFetch<ApprovalRequest[]>('/approvals/my'),

  approveRequest: (
    id: string,
    data: { status: 'APPROVED' | 'REJECTED'; authCode?: string }
  ) =>
    apiFetch(`/approvals/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
