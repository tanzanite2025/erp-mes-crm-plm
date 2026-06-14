import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getLeaveStatusBadgeClassName,
  getLeaveStatusLabel,
  getLeaveTypeLabel,
  formatLeaveDateTime,
} from '../data/leave-display'
import type { LeaveRequest } from '../data/leave-request-schema'

interface LeaveDetailDialogProps {
  leave: LeaveRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeaveDetailDialog({
  leave,
  open,
  onOpenChange,
}: LeaveDetailDialogProps) {
  const { locale, t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl overflow-hidden rounded-[28px] border-dashed p-0'>
        <div className='border-b border-dashed bg-muted/10 p-6'>
          <DialogHeader>
            <DialogTitle className='text-xl font-black tracking-tighter italic'>
              {t('orgPersonnel.leaveMgmt.detail.title')}
            </DialogTitle>
            <DialogDescription>
              {t('orgPersonnel.leaveMgmt.detail.description')}
            </DialogDescription>
          </DialogHeader>
        </div>

        {leave ? (
          <div className='grid gap-6 p-6'>
            <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
              <div>
                <p className='text-[10px] font-black tracking-widest uppercase opacity-50'>
                  {t('orgPersonnel.leaveMgmt.detail.applicant')}
                </p>
                <p className='text-lg font-black tracking-tighter italic'>
                  {leave.employeeName ||
                    t('orgPersonnel.leaveMgmt.list.unknownApplicant')}
                </p>
                <p className='font-mono text-[11px] text-muted-foreground'>
                  {t('orgPersonnel.leaveMgmt.detail.employeeId', {
                    id: leave.employeeId,
                  })}
                </p>
              </div>
              <Badge
                variant='outline'
                className={`h-6 rounded-full border-dashed px-3 text-[10px] font-black ${getLeaveStatusBadgeClassName(leave.status)}`}
              >
                {getLeaveStatusLabel(leave.status, locale)}
              </Badge>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='rounded-2xl border border-dashed bg-muted/5 p-4'>
                <p className='text-[10px] font-black tracking-widest uppercase opacity-50'>
                  {t('orgPersonnel.leaveMgmt.detail.leaveType')}
                </p>
                <p className='mt-2 text-base font-black tracking-tighter italic'>
                  {getLeaveTypeLabel(leave.leaveType, locale)}
                </p>
              </div>
              <div className='rounded-2xl border border-dashed bg-muted/5 p-4'>
                <p className='text-[10px] font-black tracking-widest uppercase opacity-50'>
                  {t('orgPersonnel.leaveMgmt.detail.leaveDays')}
                </p>
                <p className='mt-2 text-base font-black tracking-tighter text-primary italic'>
                  {leave.durationDays.toFixed(1)}{' '}
                  {t('orgPersonnel.leaveMgmt.list.daysUnit')}
                </p>
              </div>
              <div className='rounded-2xl border border-dashed bg-muted/5 p-4'>
                <p className='text-[10px] font-black tracking-widest uppercase opacity-50'>
                  {t('orgPersonnel.leaveMgmt.detail.startTime')}
                </p>
                <p className='mt-2 font-mono text-sm'>
                  {formatLeaveDateTime(leave.startTime, locale)}
                </p>
              </div>
              <div className='rounded-2xl border border-dashed bg-muted/5 p-4'>
                <p className='text-[10px] font-black tracking-widest uppercase opacity-50'>
                  {t('orgPersonnel.leaveMgmt.detail.endTime')}
                </p>
                <p className='mt-2 font-mono text-sm'>
                  {formatLeaveDateTime(leave.endTime, locale)}
                </p>
              </div>
            </div>

            <div className='rounded-2xl border border-dashed bg-muted/5 p-4'>
              <p className='text-[10px] font-black tracking-widest uppercase opacity-50'>
                {t('orgPersonnel.leaveMgmt.detail.reason')}
              </p>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                {leave.reason}
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
