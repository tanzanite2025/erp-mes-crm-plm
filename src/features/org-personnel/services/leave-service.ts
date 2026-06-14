import { apiFetch } from '@/lib/api-client'
import type { LeaveRequest, LeaveType } from '../data/leave-request-schema'

export interface LeaveRequestPreviewPayload {
  employeeId: string
  leaveType: LeaveType
  startTime: string
  endTime: string
}

export interface LeaveRequestCreatePayload extends LeaveRequestPreviewPayload {
  reason: string
}

export interface LeaveRequestPreviewResult {
  employeeId: string
  employeeName?: string
  leaveType: LeaveType
  startTime: string
  endTime: string
  durationDays: number
}

/**
 * LeaveService - 负责在线请假业务的隔离开发。
 * 遵循“后端权威”与“隔离开发”原则。
 */
export const LeaveService = {
  /**
   * 获取当前操作者代提交的请假记录
   */
  getLeaveRequests: async (): Promise<LeaveRequest[]> => {
    const data = await apiFetch<LeaveRequest[]>('/leaves/my')
    if (!data) {
      throw new Error('[CRITICAL_DATA_PATH] Failed to fetch leave records')
    }
    return data
  },

  /**
   * 提交代员工请假申请，并自动发起审批流
   * @param request 请假申请数据 (不含 ID 和状态)
   */
  previewLeaveRequest: async (
    request: LeaveRequestPreviewPayload
  ): Promise<LeaveRequestPreviewResult> => {
    const preview = await apiFetch<LeaveRequestPreviewResult>(
      '/leaves/preview',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )

    if (!preview?.employeeId) {
      throw new Error('[CRITICAL] Failed to preview leave request')
    }

    return preview
  },

  submitLeaveRequest: async (
    request: LeaveRequestCreatePayload
  ): Promise<LeaveRequest> => {
    const created = await apiFetch<LeaveRequest>('/leaves', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    if (!created?.id) {
      throw new Error('[CRITICAL] Failed to create leave request record')
    }

    return created
  },

  /**
   * 撤销请假申请
   */
  cancelLeaveRequest: async (id: string): Promise<void> => {
    await apiFetch(`/leaves/${id}/cancel`, {
      method: 'POST',
    })
  },
  /**
   * 获取当前操作者代提交的请假统计指标
   * [BACKEND-AUTHORITY]: 累计工日由后端根据排班与节假日逻辑精确计算。
   */
  getLeaveStats: async (): Promise<{
    totalDays: number
    pendingCount: number
    approvedCount: number
    rejectedCount: number
  }> => {
    const data = await apiFetch<{
      totalDays: number
      pendingCount: number
      approvedCount: number
      rejectedCount: number
    }>('/leaves/stats')
    if (!data) throw new Error('[CRITICAL] Failed to fetch leave statistics')
    return data
  },
}
