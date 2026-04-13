import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import { getLeaveStatusLabel, getLeaveTypeLabel, type LeaveSortOrder, type LeaveStatusFilter, type LeaveTypeFilter } from '../data/leave-display'

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
  const { locale, t } = useLanguage()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-muted/5 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('orgPersonnel.leaveMgmt.toolbar.title')}</p>
        <p className="text-[11px] text-muted-foreground">{t('orgPersonnel.leaveMgmt.toolbar.description')}</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as LeaveStatusFilter)}>
          <SelectTrigger className="h-10 min-w-[136px] rounded-xl border-dashed bg-background text-[10px] font-black uppercase tracking-widest">
            <SelectValue placeholder={t('orgPersonnel.leaveMgmt.toolbar.statusPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-dashed">
            <SelectItem value="ALL">{t('orgPersonnel.leaveMgmt.toolbar.allStatuses')}</SelectItem>
            <SelectItem value="PENDING">{getLeaveStatusLabel('PENDING', locale)}</SelectItem>
            <SelectItem value="APPROVED">{getLeaveStatusLabel('APPROVED', locale)}</SelectItem>
            <SelectItem value="REJECTED">{getLeaveStatusLabel('REJECTED', locale)}</SelectItem>
            <SelectItem value="CANCELED">{getLeaveStatusLabel('CANCELED', locale)}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value as LeaveTypeFilter)}>
          <SelectTrigger className="h-10 min-w-[136px] rounded-xl border-dashed bg-background text-[10px] font-black uppercase tracking-widest">
            <SelectValue placeholder={t('orgPersonnel.leaveMgmt.toolbar.typePlaceholder')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-dashed">
            <SelectItem value="ALL">{t('orgPersonnel.leaveMgmt.toolbar.allTypes')}</SelectItem>
            <SelectItem value="annual">{getLeaveTypeLabel('annual', locale)}</SelectItem>
            <SelectItem value="sick">{getLeaveTypeLabel('sick', locale)}</SelectItem>
            <SelectItem value="personal">{getLeaveTypeLabel('personal', locale)}</SelectItem>
            <SelectItem value="marriage">{getLeaveTypeLabel('marriage', locale)}</SelectItem>
            <SelectItem value="maternity">{getLeaveTypeLabel('maternity', locale)}</SelectItem>
            <SelectItem value="funeral">{getLeaveTypeLabel('funeral', locale)}</SelectItem>
            <SelectItem value="other">{getLeaveTypeLabel('other', locale)}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as LeaveSortOrder)}>
          <SelectTrigger className="h-10 min-w-[152px] rounded-xl border-dashed bg-background text-[10px] font-black uppercase tracking-widest">
            <SelectValue placeholder={t('orgPersonnel.leaveMgmt.toolbar.sortPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-dashed">
            <SelectItem value="START_DESC">{t('orgPersonnel.leaveMgmt.toolbar.sortStartDesc')}</SelectItem>
            <SelectItem value="START_ASC">{t('orgPersonnel.leaveMgmt.toolbar.sortStartAsc')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
