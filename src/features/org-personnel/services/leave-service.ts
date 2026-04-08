import { apiFetch } from '@/lib/api-client'
import { ApprovalService } from '../../approval/services/approval-service'
import type { LeaveRequest } from '../data/leave-request-schema'

/**
 * LeaveService - 负责在线请假业务的隔离开发。
 * 遵循“后端权威”与“隔离开发”原则。
 */
export const LeaveService = {
  /**
   * 获取当前用户的请假记录
   */
  getMyLeaveRequests: async (): Promise<LeaveRequest[]> => {
    const data = await apiFetch<LeaveRequest[]>('/leaves/my')
    if (!data) {
      throw new Error('[CRITICAL_DATA_PATH] Failed to fetch personal leave records')
    }
    return data
  },

  /**
   * 提交请假申请，并自动发起审批流
   * @param request 请假申请数据 (不含 ID 和状态)
   */
  submitLeaveRequest: async (request: Omit<LeaveRequest, 'id' | 'status' | 'version'>): Promise<LeaveRequest> => {
    // 1. 先在后端创建请假草稿/记录
    const created = await apiFetch<LeaveRequest>('/leaves', {
      method: 'POST',
      body: JSON.stringify(request)
    })

    if (!created?.id) {
       throw new Error('[CRITICAL] Failed to create leave request record')
    }

    // 2. 发起审批申请
    // 隔离策略：即便审批发起失败，也不应导致整个创建逻辑完全不可恢复（后端通常会事务处理）
    try {
      await ApprovalService.requestApproval({
        module: 'LEAVE',
        action: 'APPLY',
        targetId: created.id,
        reason: request.reason
      })
    } catch (error) {
       console.error('[NON-CRITICAL] Approval trigger failed for leave request:', error)
       // 注意：此处不向上抛出错误，以便用户能看到请假记录已创建（处于待提交或异常状态）
       // 或者根据业务要求决定是否回滚
    }

    return created
  },

  /**
   * 撤销请假申请
   */
  cancelLeaveRequest: async (id: string): Promise<void> => {
    await apiFetch(`/leaves/${id}/cancel`, {
      method: 'POST'
    })
  }
}
