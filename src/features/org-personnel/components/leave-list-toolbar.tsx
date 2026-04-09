import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeaveSortOrder, LeaveStatusFilter, LeaveTypeFilter } from '../data/leave-display'

interface LeaveListToolbarProps {
  statusFilter: LeaveStatusFilter
  onStatusFilterChange: (value: LeaveStatusFilter) => void
  typeFilter: LeaveTypeFilter
  onTypeFilterChange: (value: LeaveTypeFilter) => void
  sortOrder: LeaveSortOrder
  onSortOrderChange: (value: LeaveSortOrder) => void
}

export function LeaveListToolbar({
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  sortOrder,
  onSortOrderChange,
}: LeaveListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-muted/5 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">列表筛选与排序</p>
        <p className="text-[11px] text-muted-foreground">按状态、请假类型与开始时间快速定位记录</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as LeaveStatusFilter)}>
          <SelectTrigger className="h-10 min-w-[136px] rounded-xl border-dashed bg-background text-[10px] font-black uppercase tracking-widest">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-dashed">
            <SelectItem value="ALL">全部状态</SelectItem>
            <SelectItem value="PENDING">待审批</SelectItem>
            <SelectItem value="APPROVED">已通过</SelectItem>
            <SelectItem value="REJECTED">已拒绝</SelectItem>
            <SelectItem value="CANCELED">已撤销</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value as LeaveTypeFilter)}>
          <SelectTrigger className="h-10 min-w-[136px] rounded-xl border-dashed bg-background text-[10px] font-black uppercase tracking-widest">
            <SelectValue placeholder="筛选类型" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-dashed">
            <SelectItem value="ALL">全部类型</SelectItem>
            <SelectItem value="annual">年假</SelectItem>
            <SelectItem value="sick">病假</SelectItem>
            <SelectItem value="personal">事假</SelectItem>
            <SelectItem value="marriage">婚假</SelectItem>
            <SelectItem value="maternity">产假</SelectItem>
            <SelectItem value="funeral">丧假</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as LeaveSortOrder)}>
          <SelectTrigger className="h-10 min-w-[152px] rounded-xl border-dashed bg-background text-[10px] font-black uppercase tracking-widest">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-dashed">
            <SelectItem value="START_DESC">开始时间：最近优先</SelectItem>
            <SelectItem value="START_ASC">开始时间：最早优先</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
