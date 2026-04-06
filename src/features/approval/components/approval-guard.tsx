import React, { useState } from 'react'
import { KeyRound, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { ApprovalService } from '../services/approval-service'

interface ApprovalGuardProps {
  module: string
  action: string
  targetId: string
  onApproved: (token?: string) => void
  children: React.ReactElement<any>
}

export function ApprovalGuard({ module, action, targetId, onApproved, children }: ApprovalGuardProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'CHECK' | 'REQUEST' | 'VERIFY' | 'LOADING'>('CHECK')
  const [reason, setReason] = useState('')
  const [pinCode, setPinCode] = useState('')

  const apiFetchCustom = async (url: string, opts: any) => {
    const { apiFetch } = await import('@/lib/api-client')
    return apiFetch(url, opts)
  }

  const handleTrigger = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setStep('LOADING')
    try {
      await ApprovalService.requestApproval({ module, action, targetId, reason: '' })
      setStep('VERIFY')
      setIsOpen(true)
    } catch (error: any) {
      const message = String(error?.message || '')
      if (
        message.includes('404') ||
        message.includes('未配置') ||
        message.toLowerCase().includes('not configured')
      ) {
        onApproved()
        setStep('CHECK')
      } else {
        setStep('VERIFY')
        setIsOpen(true)
      }
    }
  }

  const handleVerify = async () => {
    try {
      const res = (await apiFetchCustom('/approvals/verify', {
        method: 'POST',
        body: JSON.stringify({ module, action, targetId, authCode: pinCode }),
      })) as any

      toast.success(t('approval.guard.verifySuccess'))
      setIsOpen(false)
      onApproved(res.token)
    } catch (error) {
      failLoudly(error, 'ApprovalGuard.handleVerify')
    }
  }

  const handleNewRequest = async () => {
    try {
      await ApprovalService.requestApproval({ module, action, targetId, reason })
      toast.success(t('approval.guard.requestSuccess'))
      setStep('VERIFY')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      {React.cloneElement(children, {
        onClick: (e: React.MouseEvent) => handleTrigger(e),
        disabled: step === 'LOADING' || children.props.disabled,
      })}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='sm:max-w-md rounded-[32px] border-none shadow-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-sm font-black uppercase italic tracking-tight'>
              <ShieldAlert className='h-4 w-4 text-primary' />
              {t('approval.guard.title')}
            </DialogTitle>
          </DialogHeader>

          <div className='py-6 space-y-6'>
            {step === 'VERIFY' ? (
              <div className='space-y-4'>
                <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
                  <p className='text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 leading-relaxed'>
                    {t('approval.guard.verifyDescription')}
                  </p>
                </div>
                <div className='relative'>
                  <KeyRound className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-40' />
                  <Input
                    className='h-14 pl-12 rounded-2xl border-none bg-muted/50 text-2xl font-mono tracking-[0.5em] text-center focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-black'
                    maxLength={6}
                    placeholder='······'
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className='flex items-center justify-center pt-2'>
                  <Button variant='link' className='h-auto p-0 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors' onClick={() => setStep('REQUEST')}>
                    {t('approval.guard.requestAnother')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
                  <p className='text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 leading-relaxed'>
                    {t('approval.guard.requestDescription')}
                  </p>
                </div>
                <Input
                  className='h-12 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary/20'
                  placeholder={t('approval.guard.requestPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className='-mx-6 -mb-6 rounded-b-[32px] bg-muted/30 p-4 gap-2'>
            <Button variant='ghost' className='rounded-full text-[10px] font-black uppercase tracking-widest' onClick={() => setIsOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            {step === 'VERIFY' ? (
              <Button disabled={pinCode.length !== 6} className='rounded-full px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20' onClick={handleVerify}>
                {t('approval.guard.verifyAction')}
              </Button>
            ) : (
              <Button className='rounded-full px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20' onClick={handleNewRequest}>
                {t('approval.guard.submitRequest')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
