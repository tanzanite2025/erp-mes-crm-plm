import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Calendar,
  FileText,
  BadgeCheck,
  Clock,
  XCircle,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LeaveActionDialog } from '../components/leave-action-dialog'
import { LeaveDetailDialog } from '../components/leave-detail-dialog'
import { LeaveListToolbar } from '../components/leave-list-toolbar'
import {
  formatLeaveDateTime,
  getLeaveStatusBadgeClassName,
  getLeaveStatusLabel,
  getLeaveTypeLabel,
  getSortedAndFilteredLeaves,
  type LeaveSortOrder,
  type LeaveStatusFilter,
  type LeaveTypeFilter,
} from '../data/leave-display'
import type { LeaveRequest } from '../data/leave-request-schema'
import { useCancelLeaveRequest } from '../hooks/use-cancel-leave-request'
import { personnelQueryKeys } from '../query-keys'
import { LeaveService } from '../services/leave-service'

export default function LeaveManagement() {
  const { locale, t } = useLanguage()
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<LeaveStatusFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<LeaveTypeFilter>('ALL')
  const [sortOrder, setSortOrder] = useState<LeaveSortOrder>('START_DESC')
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const { cancelLeaveRequest, isCanceling, cancelingLeaveId } =
    useCancelLeaveRequest()
  const {
    data: leaves,
    isLoading: isLeavesLoading,
    isError: isLeavesError,
    error: leavesError,
  } = useQuery({
    queryKey: personnelQueryKeys.leaves.list(),
    queryFn: () => LeaveService.getLeaveRequests(),
  })

  // [BACKEND-AUTHORITY]: 获取由后端财务与人事服务精确计算的统计指标
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
  } = useQuery({
    queryKey: personnelQueryKeys.leaves.stats(),
    queryFn: () => LeaveService.getLeaveStats(),
  })

  const isListLoading = isLeavesLoading
  const isStatsLoadingOnly = isStatsLoading
  const visibleLeaves = getSortedAndFilteredLeaves(
    leaves ?? [],
    statusFilter,
    typeFilter,
    sortOrder
  )

  const handleCancelLeave = async (leaveId: string) => {
    await cancelLeaveRequest(leaveId)
  }

  return (
    <div className='flex animate-in flex-col gap-8 p-8 duration-700 fade-in'>
      {/* 页眉操作栏 */}
      <header className='flex items-center justify-between rounded-[24px] border border-dashed bg-muted/5 p-6'>
        <div className='space-y-1'>
          <h2 className='flex items-center gap-2 text-sm font-black tracking-tighter uppercase italic'>
            <Calendar className='h-4 w-4 text-primary' />
            {t('orgPersonnel.leaveMgmt.headerTitle')}
          </h2>
          <p className='text-[9px] font-black tracking-widest uppercase opacity-60'>
            {t('orgPersonnel.leaveMgmt.headerDescription')}
          </p>
        </div>
        <Button
          className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
          onClick={() => setIsActionDialogOpen(true)}
        >
          <Plus className='mr-2 h-3 w-3' />
          {t('orgPersonnel.leaveMgmt.createRequest')}
        </Button>
      </header>

      {/* 状态统计概览 */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        {[
          {
            icon: Clock,
            label: t('orgPersonnel.leaveMgmt.summary.pending'),
            val: isStatsError ? '--' : (stats?.pendingCount ?? 0),
            color: 'text-amber-500',
          },
          {
            icon: BadgeCheck,
            label: t('orgPersonnel.leaveMgmt.summary.approved'),
            val: isStatsError ? '--' : (stats?.approvedCount ?? 0),
            color: 'text-emerald-500',
          },
          {
            icon: XCircle,
            label: t('orgPersonnel.leaveMgmt.summary.rejected'),
            val: isStatsError ? '--' : (stats?.rejectedCount ?? 0),
            color: 'text-rose-500',
          },
          {
            icon: Calendar,
            label: t('orgPersonnel.leaveMgmt.summary.totalDays'),
            val: isStatsError ? '--' : (stats?.totalDays ?? 0).toFixed(1),
            color: 'text-primary',
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className='flex items-center gap-4 rounded-2xl border-dashed bg-muted/5 p-4'
          >
            <div
              className={`rounded-xl bg-white/50 p-2 dark:bg-black/20 ${stat.color}`}
            >
              <stat.icon className='h-5 w-5' />
            </div>
            <div>
              <p className='text-[8px] font-black tracking-widest uppercase opacity-50'>
                {stat.label}
              </p>
              <p className='text-lg font-black tracking-tighter italic'>
                {stat.val}
              </p>
              {isStatsLoadingOnly ? (
                <p className='text-[8px] font-black tracking-widest uppercase opacity-40'>
                  {t('orgPersonnel.leaveMgmt.summary.syncing')}
                </p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      {isStatsError ? (
        <div className='rounded-[20px] border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-amber-900'>
          <div className='text-[10px] font-black tracking-widest uppercase'>
            {t('orgPersonnel.leaveMgmt.statsError.title')}
          </div>
          <p className='mt-1 text-[11px] leading-relaxed font-bold'>
            {statsError instanceof Error
              ? statsError.message
              : t('orgPersonnel.leaveMgmt.statsError.fallback')}
          </p>
          <p className='mt-1 text-[10px] font-medium opacity-80'>
            {t('orgPersonnel.leaveMgmt.statsError.hint')}
          </p>
        </div>
      ) : null}

      {/* 请假列表 */}
      <div className='rounded-[24px] border border-dashed p-6'>
        <div className='space-y-4'>
          <LeaveListToolbar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
          />

          {isListLoading ? (
            <p className='animate-pulse text-[10px] font-black tracking-widest uppercase'>
              {t('orgPersonnel.leaveMgmt.list.loading')}
            </p>
          ) : isLeavesError ? (
            <div className='flex h-40 flex-col items-center justify-center gap-2 text-center text-rose-600'>
              <FileText className='h-8 w-8 opacity-40' />
              <p className='text-[10px] font-black tracking-widest uppercase'>
                {t('orgPersonnel.leaveMgmt.list.unavailable')}
              </p>
              <p className='max-w-[360px] text-[10px] font-medium text-rose-700/80'>
                {leavesError instanceof Error
                  ? leavesError.message
                  : t('orgPersonnel.leaveMgmt.list.loadFailed')}
              </p>
            </div>
          ) : (leaves?.length || 0) === 0 ? (
            <div className='flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground'>
              <FileText className='h-8 w-8 opacity-20' />
              <p className='text-[10px] font-black tracking-widest uppercase'>
                {t('orgPersonnel.leaveMgmt.list.empty')}
              </p>
            </div>
          ) : visibleLeaves.length === 0 ? (
            <div className='flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground'>
              <FileText className='h-8 w-8 opacity-20' />
              <p className='text-[10px] font-black tracking-widest uppercase'>
                {t('orgPersonnel.leaveMgmt.list.filteredEmpty')}
              </p>
            </div>
          ) : (
            <div className='grid gap-4'>
              {visibleLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className='group flex items-center justify-between rounded-2xl border border-dashed border-primary/5 p-4 transition-all hover:border-primary/20 hover:bg-muted/5'
                >
                  <div className='flex items-center gap-6'>
                    <div className='flex min-w-[64px] flex-col items-center justify-center rounded-xl bg-primary/5 p-3'>
                      <span className='text-[10px] font-black text-primary italic'>
                        {getLeaveTypeLabel(leave.leaveType, locale)}
                      </span>
                    </div>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <h4 className='text-sm font-black tracking-tighter uppercase italic'>
                          {leave.employeeName ||
                            t('orgPersonnel.leaveMgmt.list.unknownApplicant')}
                        </h4>
                        <Badge
                          variant='outline'
                          className={`h-4 rounded-full border-dashed px-2 font-mono text-[8px] ${getLeaveStatusBadgeClassName(leave.status)}`}
                        >
                          {getLeaveStatusLabel(leave.status, locale)}
                        </Badge>
                      </div>
                      <p className='font-mono text-[9px] text-muted-foreground'>
                        {formatLeaveDateTime(leave.startTime, locale)} →{' '}
                        {formatLeaveDateTime(leave.endTime, locale)}
                      </p>
                      <p className='text-[10px] text-muted-foreground/80'>
                        {leave.reason}
                      </p>
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-2 text-right'>
                    <p className='text-xl font-black tracking-tighter text-primary italic'>
                      {leave.durationDays}
                    </p>
                    <p className='text-[8px] font-black tracking-widest uppercase opacity-50'>
                      {t('orgPersonnel.leaveMgmt.list.daysLabel')}
                    </p>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='rounded-full text-[10px] font-black tracking-widest'
                      onClick={() => setSelectedLeave(leave)}
                    >
                      {t('orgPersonnel.leaveMgmt.list.viewDetail')}
                    </Button>
                    {leave.status === 'PENDING' ? (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='rounded-full border-dashed text-[10px] font-black tracking-widest'
                        disabled={isCanceling}
                        onClick={() => void handleCancelLeave(leave.id)}
                      >
                        {cancelingLeaveId === leave.id
                          ? t('orgPersonnel.leaveMgmt.list.canceling')
                          : t('orgPersonnel.leaveMgmt.list.cancelRequest')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LeaveActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
      />
      <LeaveDetailDialog
        open={Boolean(selectedLeave)}
        leave={selectedLeave}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLeave(null)
          }
        }}
      />
    </div>
  )
}
