import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  History as HistoryIcon,
  Lock,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { ForbiddenState } from '@/components/forbidden-state'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  getApprovalActionLabel,
  getApprovalModuleLabel,
  getApprovalStatusMeta,
} from '../approval-i18n'
import { DeltaPreview } from '../components/delta-preview'
import {
  ApprovalService,
  type ApprovalRequest,
} from '../services/approval-service'

export function ApprovalRequests() {
  const { t, locale } = useLanguage()
  const { allowsAction } = usePermissionActions()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const currentUserId = useAuthStore((state) => state.user?.id)
  const [pinModal, setPinModal] = useState<{ id: string; open: boolean }>({
    id: '',
    open: false,
  })
  const [pinCode, setPinCode] = useState('')

  const fetchRequests = async () => {
    try {
      setError(null)
      const data = await ApprovalService.getMyApprovals()
      setRequests(data)
    } catch (error) {
      setError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleApprove = async (id: string, code?: string) => {
    if (!allowsAction('action_approval_review')) return
    try {
      await ApprovalService.approveRequest(id, {
        status: 'APPROVED',
        authCode: code,
      })
      toast.success(t('approval.requests.approvedToast'))
      setPinModal({ id: '', open: false })
      setPinCode('')
      fetchRequests()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('approval.requests.rejectedToast')
      )
    }
  }

  const handleReject = async (id: string) => {
    if (!allowsAction('action_approval_review')) return
    try {
      await ApprovalService.approveRequest(id, { status: 'REJECTED' })
      toast.success(t('approval.requests.rejectedToast'))
      fetchRequests()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('approval.requests.rejectedToast')
      )
    }
  }

  const pendingForMe = useMemo(
    () =>
      requests
        .filter((r) => r.status === 'PENDING' || r.status === 'APPROVED_L1')
        .filter((r) => {
          if (r.currentLevel === 1) return r.approver1Id === currentUserId
          if (r.currentLevel === 2) return r.approver2Id === currentUserId
          return false
        }),
    [currentUserId, requests]
  )

  const myRequests = useMemo(
    () => requests.filter((r) => r.requesterId === currentUserId),
    [currentUserId, requests]
  )

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (loading) {
    return (
      <div className='animate-in space-y-4 duration-500 fade-in'>
        <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
          <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
            <h2 className='text-lg font-black tracking-tighter uppercase italic'>
              {t('approval.requests.heroTitle')}
            </h2>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
              {t('approval.requests.loading')}
            </p>
          </div>
        </div>
        <div className='flex min-h-32 items-center justify-center rounded-[28px] border border-dashed border-muted/50 bg-muted/5 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
          {t('approval.requests.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className='animate-in space-y-4 duration-700 fade-in'>
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <div className='flex items-center gap-2 text-primary'>
            <Shield className='size-5' />
            <h2 className='text-lg font-black tracking-tighter uppercase italic'>
              {t('approval.requests.heroTitle')}
            </h2>
          </div>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
            {t('approval.requests.heroSubtitle', {
              count: pendingForMe.length,
            })}
          </p>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {pendingForMe.length === 0 ? (
          <div className='col-span-full flex flex-col items-center justify-center rounded-[28px] border border-dashed bg-muted/5 py-12 text-muted-foreground/20 italic'>
            <Check className='mb-2 size-9 opacity-10' />
            <p className='text-[10px] font-black tracking-widest uppercase'>
              {t('approval.requests.emptyPending')}
            </p>
          </div>
        ) : (
          pendingForMe.map((req) => (
            <Card
              key={req.id}
              className='group animate-in gap-4 overflow-hidden rounded-[28px] border-dashed border-muted/50 bg-muted/2 py-4 shadow-xl shadow-primary/2 duration-300 zoom-in-95 hover:bg-muted/5'
            >
              <CardContent className='space-y-3 px-4 pt-0'>
                <div className='flex items-center justify-between'>
                  <Badge
                    variant='outline'
                    className='h-5 rounded-full border-none bg-primary/10 px-2 py-0 text-[8px] font-black text-primary uppercase'
                  >
                    {getApprovalModuleLabel(t, req.module)}
                  </Badge>
                  <div className='flex items-center gap-2'>
                    <AuditStatusDisplay
                      meta={getApprovalStatusMeta(t, req.status)}
                      badgeClassName='h-5 px-2 py-0'
                    />
                    <span className='text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      {t('approval.labels.createdAt')}:{' '}
                      {new Date(req.createdAt).toLocaleString(locale)}
                    </span>
                  </div>
                </div>

                <div className='space-y-3'>
                  <h4 className='flex items-center gap-2 text-base font-black tracking-tighter uppercase italic'>
                    <Lock className='size-4 text-primary' />
                    {getApprovalActionLabel(t, req.action)}
                  </h4>

                  <div className='rounded-[18px] border border-dashed border-muted-foreground/10 bg-muted/5 p-3.5 text-xs leading-relaxed font-bold text-muted-foreground/80 shadow-inner'>
                    <span className='mb-1.5 block text-[9px] font-black tracking-widest uppercase italic opacity-40'>
                      {t('approval.labels.requestReason')} / REQUEST_REASON
                    </span>
                    <p className='text-xs font-black tracking-tight italic opacity-90'>
                      {req.reason || t('approval.requests.noReasonProvided')}
                    </p>
                  </div>

                  {/* SDRTS 差量预览区 */}
                  <DeltaPreview
                    delta={req.delta}
                    className='rounded-[20px] border-none bg-background/40 shadow-none'
                  />
                </div>

                <div className='flex items-center gap-3 px-1 pt-0.5'>
                  <div className='flex size-8 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-[10px] font-black text-primary uppercase shadow-sm'>
                    {req.requester?.username?.charAt(0) || 'U'}
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-xs font-black tracking-tight italic'>
                      {req.requester?.username}
                    </span>
                    <span className='text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-40'>
                      {t('approval.labels.requester')}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className='gap-2 border-t border-dashed border-muted/50 bg-muted/10 p-3'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-9 flex-1 rounded-full text-[10px] font-black tracking-widest uppercase hover:bg-destructive/10 hover:text-destructive'
                  onClick={() => handleReject(req.id)}
                >
                  {t('approval.requests.reject')}
                </Button>
                <Button
                  size='sm'
                  className='h-9 flex-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20'
                  onClick={() => {
                    const isFinal = req.currentLevel === 2 || !req.approver2Id
                    if (isFinal) {
                      setPinModal({ id: req.id, open: true })
                    } else {
                      handleApprove(req.id)
                    }
                  }}
                >
                  {req.currentLevel === 2 || !req.approver2Id
                    ? t('approval.requests.confirm')
                    : t('approval.requests.l1Pass')}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <div className='flex items-start justify-between gap-4 px-1 pt-1'>
        <div className='min-w-0 space-y-1'>
          <div className='flex items-center gap-2 text-muted-foreground'>
            <HistoryIcon className='size-4 shrink-0' />
            <h3 className='text-lg font-black tracking-tighter uppercase italic'>
              {t('approval.requests.myLogsTitle')}
            </h3>
          </div>
          <p className='max-w-2xl text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {t('approval.requests.myLogsSubtitle')}
          </p>
        </div>
      </div>

      <div className='overflow-hidden rounded-[28px] border border-dashed bg-muted/5 shadow-inner'>
        <table className='w-full'>
          <thead>
            <tr className='h-11 border-b border-dashed bg-muted/30'>
              <th className='px-4 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.requests.table.content')}
              </th>
              <th className='px-4 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.requests.table.status')}
              </th>
              <th className='px-4 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.requests.table.pinCode')}
              </th>
              <th className='px-4 text-right text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.requests.table.timestamp')}
              </th>
            </tr>
          </thead>
          <tbody>
            {myRequests.map((req) => (
              <tr
                key={req.id}
                className='h-14 border-b transition-colors last:border-0 hover:bg-muted/5'
              >
                <td className='px-4'>
                  <div className='text-xs font-black'>
                    {getApprovalModuleLabel(t, req.module)} -{' '}
                    {getApprovalActionLabel(t, req.action)}
                  </div>
                  <div className='font-mono text-[10px] text-muted-foreground/60'>
                    ID: {req.targetId}
                  </div>
                </td>
                <td className='px-4'>
                  <AuditStatusDisplay
                    meta={getApprovalStatusMeta(t, req.status)}
                    badgeClassName='h-5 px-2 py-0'
                  />
                </td>
                <td className='px-4'>
                  {req.authCode ? (
                    <div className='flex items-center gap-2 font-mono text-sm font-black text-primary'>
                      <Lock className='h-3 w-3 opacity-40' />
                      {req.authCode}
                    </div>
                  ) : (
                    <span className='text-muted-foreground/30'>-</span>
                  )}
                </td>
                <td className='px-4 text-right font-mono text-[10px] text-muted-foreground'>
                  {new Date(req.createdAt).toLocaleString(locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {myRequests.length === 0 && (
          <div className='py-12 text-center text-[10px] font-black tracking-widest text-muted-foreground/20 uppercase italic'>
            {t('approval.requests.emptyMine')}
          </div>
        )}
      </div>

      <Dialog
        open={pinModal.open}
        onOpenChange={(open) => setPinModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-yellow-500' />
              {t('approval.requests.pinDialogTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <p className='text-sm text-muted-foreground'>
              {t('approval.requests.pinDialogDescription')}
            </p>
            <Input
              type='text'
              maxLength={6}
              className='text-center font-mono text-2xl tracking-[1em]'
              placeholder='000000'
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setPinModal({ id: '', open: false })}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              disabled={pinCode.length !== 6}
              onClick={() => handleApprove(pinModal.id, pinCode)}
            >
              {t('approval.requests.issuePin')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
