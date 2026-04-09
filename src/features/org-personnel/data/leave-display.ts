import type { LeaveRequest, LeaveRequestStatus, LeaveType } from './leave-request-schema'

export const leaveStatusLabelMap: Record<LeaveRequestStatus, string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELED: '已撤销',
}

export const leaveStatusBadgeClassMap: Record<LeaveRequestStatus, string> = {
  PENDING: 'border-amber-500/30 text-amber-600 bg-amber-500/5',
  APPROVED: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5',
  REJECTED: 'border-rose-500/30 text-rose-600 bg-rose-500/5',
  CANCELED: 'border-slate-500/30 text-slate-600 bg-slate-500/5',
}

export const leaveTypeLabelMap: Record<LeaveType, string> = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  marriage: '婚假',
  maternity: '产假',
  funeral: '丧假',
  other: '其他',
}

const leaveDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export type LeaveStatusFilter = 'ALL' | LeaveRequestStatus
export type LeaveTypeFilter = 'ALL' | LeaveType
export type LeaveSortOrder = 'START_DESC' | 'START_ASC'

export function formatLeaveDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return leaveDateTimeFormatter.format(date)
}

export function getLeaveStatusLabel(status: LeaveRequestStatus | string) {
  return leaveStatusLabelMap[status as LeaveRequestStatus] || status
}

export function getLeaveStatusBadgeClassName(status: LeaveRequestStatus | string) {
  return leaveStatusBadgeClassMap[status as LeaveRequestStatus] || 'border-dashed'
}

export function getLeaveTypeLabel(leaveType: LeaveType | string) {
  return leaveTypeLabelMap[leaveType as LeaveType] || leaveType
}

export function getSortedAndFilteredLeaves(
  leaves: LeaveRequest[],
  statusFilter: LeaveStatusFilter,
  typeFilter: LeaveTypeFilter,
  sortOrder: LeaveSortOrder,
) {
  return [...leaves]
    .filter((leave) => statusFilter === 'ALL' || leave.status === statusFilter)
    .filter((leave) => typeFilter === 'ALL' || leave.leaveType === typeFilter)
    .sort((left, right) => {
      const leftTime = new Date(left.startTime).getTime()
      const rightTime = new Date(right.startTime).getTime()
      const safeLeftTime = Number.isNaN(leftTime) ? 0 : leftTime
      const safeRightTime = Number.isNaN(rightTime) ? 0 : rightTime
      if (sortOrder === 'START_ASC') {
        return safeLeftTime - safeRightTime
      }
      return safeRightTime - safeLeftTime
    })
}
