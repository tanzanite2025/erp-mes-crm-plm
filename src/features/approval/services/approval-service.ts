import { apiFetch } from '@/lib/api-client'

export interface ApprovalUserOption {
  id: string
  username: string
  employeeId?: string
  firstName?: string
  lastName?: string
  role?: string
  status?: string
}

export interface ApprovalConfig {
  id: string
  module: string
  action: string
  approver1Id: string
  approver1?: any
  approver2Id?: string
  approver2?: any
  isActive: boolean
  description?: string
}

export interface ApprovalRequest {
  id: string
  configId: string
  config?: ApprovalConfig
  requesterId: string
  requester?: any
  targetId: string
  reason: string
  currentLevel: number
  status: 'PENDING' | 'APPROVED_L1' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONSUMED'
  authCode?: string
  expiresAt?: string
  module: string
  action: string
  createdAt: string
  delta?: any // SDRTS 格式的差量快照
  targetVersion?: number // 被审批实体的目标版次
}

export const ApprovalService = {
  getConfigs: () => apiFetch<ApprovalConfig[]>('/approvals/configs'),
  fetchUserOptions: () => apiFetch<ApprovalUserOption[]>('/users?options=true'),
  
  saveConfig: (config: Partial<ApprovalConfig>) => 
    apiFetch('/approvals/configs', {
      method: 'POST',
      body: JSON.stringify(config)
    }),

  requestApproval: (data: { module: string; action: string; targetId: string; reason: string }) =>
    apiFetch<ApprovalRequest>('/approvals/request', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMyApprovals: () => apiFetch<ApprovalRequest[]>('/approvals/my'),

  approveRequest: (id: string, data: { status: 'APPROVED' | 'REJECTED'; authCode?: string }) =>
    apiFetch(`/approvals/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
}
