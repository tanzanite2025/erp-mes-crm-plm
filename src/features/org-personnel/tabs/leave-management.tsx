import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LeaveService } from '../services/leave-service'
import { personnelQueryKeys } from '../query-keys'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, FileText, BadgeCheck, Clock, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LeaveActionDialog } from '../components/leave-action-dialog'
import { useCancelLeaveRequest } from '../hooks/use-cancel-leave-request'
import { LeaveListToolbar } from '../components/leave-list-toolbar'
import { LeaveDetailDialog } from '../components/leave-detail-dialog'
import { formatLeaveDateTime, getLeaveStatusBadgeClassName, getLeaveStatusLabel, getLeaveTypeLabel, getSortedAndFilteredLeaves, type LeaveSortOrder, type LeaveStatusFilter, type LeaveTypeFilter } from '../data/leave-display'
import type { LeaveRequest } from '../data/leave-request-schema'

export default function LeaveManagement() {
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<LeaveStatusFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<LeaveTypeFilter>('ALL')
  const [sortOrder, setSortOrder] = useState<LeaveSortOrder>('START_DESC')
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const { cancelLeaveRequest, isCanceling, cancelingLeaveId } = useCancelLeaveRequest()
  const { data: leaves, isLoading: isLeavesLoading } = useQuery({
    queryKey: personnelQueryKeys.leaves.my(),
    queryFn: () => LeaveService.getMyLeaveRequests()
  })

  // [BACKEND-AUTHORITY]: 获取由后端财务与人事服务精确计算的统计指标
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: personnelQueryKeys.leaves.statsMy(),
    queryFn: () => LeaveService.getLeaveStats()
  })

  const isLoading = isLeavesLoading || isStatsLoading
  const visibleLeaves = getSortedAndFilteredLeaves(leaves ?? [], statusFilter, typeFilter, sortOrder)

  const handleCancelLeave = async (leaveId: string) => {
    await cancelLeaveRequest(leaveId)
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 p-8">
      {/* 页眉操作栏 */}
      <header className="flex items-center justify-between rounded-[24px] border-dashed border p-6 bg-muted/5">
        <div className="space-y-1">
          <h2 className="text-sm font-black italic tracking-tighter uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Online Leave Requests
          </h2>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
            全数字化请假申请与审批追踪系统
          </p>
        </div>
        <Button className="rounded-full px-6 h-11 font-black text-[10px] uppercase tracking-widest" onClick={() => setIsActionDialogOpen(true)}>
           <Plus className="w-3 h-3 mr-2" />
           新建请假申请
        </Button>
      </header>

      {/* 状态统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Clock, label: '待审批', val: stats?.pendingCount ?? 0, color: 'text-amber-500' },
          { icon: BadgeCheck, label: '已通过', val: stats?.approvedCount ?? 0, color: 'text-emerald-500' },
          { icon: XCircle, label: '已拒绝', val: stats?.rejectedCount ?? 0, color: 'text-rose-500' },
          { 
            icon: Calendar, 
            label: '累计工日', 
            // [BACKEND-AUTHORITY]: 权威统计，禁止前端自行累加
            val: (stats?.totalDays ?? 0).toFixed(1), 
            color: 'text-primary' 
          },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl p-4 border-dashed bg-muted/5 flex items-center gap-4">
             <div className={`p-2 rounded-xl bg-white/50 dark:bg-black/20 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
             </div>
             <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-50">{stat.label}</p>
                <p className="text-lg font-black italic tracking-tighter">{stat.val}</p>
             </div>
          </Card>
        ))}
      </div>

      {/* 请假列表 */}
      <div className="rounded-[24px] border border-dashed p-6">
        <div className="space-y-4">
          <LeaveListToolbar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
          />

          {isLoading ? (
            <p className="text-[10px] uppercase font-black tracking-widest animate-pulse">正在同步云端记录...</p>
          ) : (leaves?.length || 0) === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
               <FileText className="w-8 h-8 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest">暂无请假历史记录</p>
            </div>
          ) : visibleLeaves.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
               <FileText className="w-8 h-8 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest">当前筛选条件下暂无记录</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleLeaves.map(leave => (
                <div key={leave.id} className="group p-4 rounded-2xl border border-dashed border-primary/5 hover:border-primary/20 hover:bg-muted/5 transition-all flex items-center justify-between">
                   <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-primary/5 min-w-[64px]">
                         <span className="text-[10px] font-black italic text-primary">{getLeaveTypeLabel(leave.leaveType)}</span>
                      </div>
                      <div className="space-y-1">
                         <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black italic tracking-tighter uppercase">{leave.employeeName || '本人申请'}</h4>
                            <Badge variant="outline" className={`h-4 text-[8px] rounded-full px-2 font-mono border-dashed ${getLeaveStatusBadgeClassName(leave.status)}`}>
                               {getLeaveStatusLabel(leave.status)}
                            </Badge>
                         </div>
                         <p className="text-[9px] font-mono text-muted-foreground">{formatLeaveDateTime(leave.startTime)} → {formatLeaveDateTime(leave.endTime)}</p>
                         <p className="text-[10px] text-muted-foreground/80">{leave.reason}</p>
                      </div>
                   </div>
                   <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-xl font-black italic tracking-tighter text-primary">{leave.durationDays}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-50">DAYS</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-[10px] font-black tracking-widest"
                        onClick={() => setSelectedLeave(leave)}
                      >
                        查看详情
                      </Button>
                      {leave.status === 'PENDING' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-dashed text-[10px] font-black tracking-widest"
                          disabled={isCanceling}
                          onClick={() => void handleCancelLeave(leave.id)}
                        >
                          {cancelingLeaveId === leave.id ? '撤销中...' : '撤销申请'}
                        </Button>
                      ) : null}
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LeaveActionDialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen} />
      <LeaveDetailDialog open={Boolean(selectedLeave)} leave={selectedLeave} onOpenChange={(open) => {
        if (!open) {
          setSelectedLeave(null)
        }
      }} />
    </div>
  )
}
