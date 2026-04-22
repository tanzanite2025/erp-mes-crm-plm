import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, History as HistoryIcon, Lock, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { useAuthStore } from '@/stores/auth-store'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import {
  getApprovalActionLabel,
  getApprovalModuleLabel,
  getApprovalStatusMeta,
} from '../approval-i18n'
import { ApprovalService, type ApprovalRequest } from '../services/approval-service'
import { DeltaPreview } from '../components/delta-preview'

export function ApprovalRequests() {
  const { t, locale } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const currentUserId = useAuthStore((state) => state.user?.id)
  const [pinModal, setPinModal] = useState<{ id: string; open: boolean }>({ id: '', open: false })
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
      await ApprovalService.approveRequest(id, { status: 'APPROVED', authCode: code })
      toast.success(t('approval.requests.approvedToast'))
      setPinModal({ id: '', open: false })
      setPinCode('')
      fetchRequests()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('approval.requests.rejectedToast'))
    }
  }

  const handleReject = async (id: string) => {
    if (!allowsAction('action_approval_review')) return
    try {
      await ApprovalService.approveRequest(id, { status: 'REJECTED' })
      toast.success(t('approval.requests.rejectedToast'))
      fetchRequests()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('approval.requests.rejectedToast'))
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

  if (loading) return <div>{t('approval.requests.loading')}</div>

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-8 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
        <div className='flex items-center gap-3 text-primary relative z-10'>
          <Shield className='size-5' />
          <h3 className='text-xl font-black uppercase italic tracking-tighter'>
            {t('approval.requests.heroTitle')}
          </h3>
        </div>
        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 relative z-10'>
          {t('approval.requests.heroSubtitle', { count: pendingForMe.length })}
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {pendingForMe.length === 0 ? (
          <div className='col-span-full flex flex-col items-center justify-center rounded-[32px] border border-dashed bg-muted/5 py-24 italic text-muted-foreground/20'>
            <Check className='mb-4 size-12 opacity-10' />
            <p className='text-[11px] font-black uppercase tracking-widest'>
              {t('approval.requests.emptyPending')}
            </p>
          </div>
        ) : (
          pendingForMe.map((req) => (
            <Card
              key={req.id}
              className='group overflow-hidden rounded-[32px] border-dashed border-muted/50 bg-muted/2 shadow-xl shadow-primary/2 duration-300 hover:bg-muted/5 animate-in zoom-in-95'
            >
              <CardContent className='space-y-4 pt-6'>
                <div className='flex items-center justify-between'>
                  <Badge
                    variant='outline'
                    className='h-5 rounded-full border-none bg-primary/10 px-2 py-0 text-[8px] font-black uppercase text-primary'
                  >
                    {getApprovalModuleLabel(t, req.module)}
                  </Badge>
                  <div className='flex items-center gap-3'>
                    <AuditStatusDisplay
                      meta={getApprovalStatusMeta(t, req.status)}
                      badgeClassName='h-5 px-2 py-0'
                    />
                    <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                      {t('approval.labels.createdAt')}: {new Date(req.createdAt).toLocaleString(locale)}
                    </span>
                  </div>
                </div>

                <div className='space-y-4'>
                  <h4 className='flex items-center gap-2 text-base font-black uppercase italic tracking-tighter'>
                    <Lock className='size-4 text-primary' />
                    {getApprovalActionLabel(t, req.action)}
                  </h4>

                  <div className='rounded-[20px] border border-dashed border-muted-foreground/10 bg-muted/5 p-5 text-xs font-bold leading-relaxed text-muted-foreground/80 shadow-inner'>
                    <span className='mb-2 block text-[9px] font-black uppercase tracking-widest opacity-40 italic'>
                      {t('approval.labels.requestReason')} / REQUEST_REASON
                    </span>
                    <p className='text-xs font-black italic tracking-tight opacity-90'>
                      {req.reason || t('approval.requests.noReasonProvided')}
                    </p>
                  </div>

                  {/* SDRTS 差量预览区 */}
                  <DeltaPreview 
                    delta={req.delta} 
                    className='rounded-[24px] border-none shadow-none bg-background/40' 
                  />
                </div>

                <div className='flex items-center gap-3 px-1 pt-2'>
                  <div className='flex size-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-[10px] font-black uppercase text-primary shadow-sm'>
                    {req.requester?.username?.charAt(0) || 'U'}
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-xs font-black italic tracking-tight'>
                      {req.requester?.username}
                    </span>
                    <span className='text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-40'>
                      {t('approval.labels.requester')}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className='gap-3 border-t border-dashed border-muted/50 bg-muted/10 p-4'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-10 flex-1 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive'
                  onClick={() => handleReject(req.id)}
                >
                  {t('approval.requests.reject')}
                </Button>
                <Button
                  size='sm'
                  className='h-10 flex-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20'
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

      <div className='mt-10 flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-8 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent pointer-events-none' />
        <div className='flex items-center gap-3 text-muted-foreground relative z-10'>
          <HistoryIcon className='size-5' />
          <h3 className='text-xl font-black uppercase italic tracking-tighter'>
            {t('approval.requests.myLogsTitle')}
          </h3>
        </div>
        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 relative z-10'>
          {t('approval.requests.myLogsSubtitle')}
        </p>
      </div>

      <div className='overflow-hidden rounded-[32px] border border-dashed bg-muted/5 shadow-inner'>
        <table className='w-full'>
          <thead>
            <tr className='h-14 border-b border-dashed bg-muted/30'>
              <th className='px-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.requests.table.content')}
              </th>
              <th className='px-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.requests.table.status')}
              </th>
              <th className='px-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.requests.table.pinCode')}
              </th>
              <th className='px-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.requests.table.timestamp')}
              </th>
            </tr>
          </thead>
          <tbody>
            {myRequests.map((req) => (
              <tr key={req.id} className='h-16 border-b transition-colors last:border-0 hover:bg-muted/5'>
                <td className='px-6'>
                  <div className='text-xs font-black'>
                    {getApprovalModuleLabel(t, req.module)} - {getApprovalActionLabel(t, req.action)}
                  </div>
                  <div className='text-[10px] font-mono text-muted-foreground/60'>
                    ID: {req.targetId}
                  </div>
                </td>
                <td className='px-6'>
                  <AuditStatusDisplay
                    meta={getApprovalStatusMeta(t, req.status)}
                    badgeClassName='h-5 px-2 py-0'
                  />
                </td>
                <td className='px-6'>
                  {req.authCode ? (
                    <div className='flex items-center gap-2 font-mono text-sm font-black text-primary'>
                      <Lock className='h-3 w-3 opacity-40' />
                      {req.authCode}
                    </div>
                  ) : (
                    <span className='text-muted-foreground/30'>-</span>
                  )}
                </td>
                <td className='px-6 text-right text-[10px] font-mono text-muted-foreground'>
                  {new Date(req.createdAt).toLocaleString(locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {myRequests.length === 0 && (
          <div className='py-20 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground/20 italic'>
            {t('approval.requests.emptyMine')}
          </div>
        )}
      </div>

      <Dialog open={pinModal.open} onOpenChange={(open) => setPinModal((prev) => ({ ...prev, open }))}>
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
            <Button variant='outline' onClick={() => setPinModal({ id: '', open: false })}>
              {t('common.actions.cancel')}
            </Button>
            <Button disabled={pinCode.length !== 6} onClick={() => handleApprove(pinModal.id, pinCode)}>
              {t('approval.requests.issuePin')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
