import type { LeaveRequest, LeaveRequestStatus, LeaveType } from './leave-request-schema'

const leaveStatusLabelMaps: Record<string, Record<LeaveRequestStatus, string>> = {
  'zh-CN': {
    PENDING: '待审批',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    CANCELED: '已撤销',
  },
  'en-US': {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELED: 'Canceled',
  },
}

export const leaveStatusBadgeClassMap: Record<LeaveRequestStatus, string> = {
  PENDING: 'border-amber-500/30 text-amber-600 bg-amber-500/5',
  APPROVED: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5',
  REJECTED: 'border-rose-500/30 text-rose-600 bg-rose-500/5',
  CANCELED: 'border-slate-500/30 text-slate-600 bg-slate-500/5',
}

const leaveTypeLabelMaps: Record<string, Record<LeaveType, string>> = {
  'zh-CN': {
    annual: '年假',
    sick: '病假',
    personal: '事假',
    marriage: '婚假',
    maternity: '产假',
    funeral: '丧假',
    other: '其他',
  },
  'en-US': {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    personal: 'Personal Leave',
    marriage: 'Marriage Leave',
    maternity: 'Maternity Leave',
    funeral: 'Funeral Leave',
    other: 'Other',
  },
}

export type LeaveStatusFilter = 'ALL' | LeaveRequestStatus
export type LeaveTypeFilter = 'ALL' | LeaveType
export type LeaveSortOrder = 'START_DESC' | 'START_ASC'

export function formatLeaveDateTime(value: string, locale: string = 'zh-CN') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const formatter = new Intl.DateTimeFormat(locale === 'en-US' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return formatter.format(date)
}

export function getLeaveStatusLabel(status: LeaveRequestStatus | string, locale: string = 'zh-CN') {
  const labelMap = leaveStatusLabelMaps[locale] || leaveStatusLabelMaps['zh-CN']
  return labelMap[status as LeaveRequestStatus] || status
}

export function getLeaveStatusBadgeClassName(status: LeaveRequestStatus | string) {
  return leaveStatusBadgeClassMap[status as LeaveRequestStatus] || 'border-dashed'
}

export function getLeaveTypeLabel(leaveType: LeaveType | string, locale: string = 'zh-CN') {
  const labelMap = leaveTypeLabelMaps[locale] || leaveTypeLabelMaps['zh-CN']
  return labelMap[leaveType as LeaveType] || leaveType
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
