import React, { useState } from 'react'
import { KeyRound, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface ApprovalGuardProps {
  module: string
  action: string
  targetId: string
  onApproved: (token?: string) => void
  children: React.ReactElement<{
    disabled?: boolean
    onClick?: React.MouseEventHandler
  }>
}

export function ApprovalGuard({
  module,
  action,
  targetId,
  onApproved,
  children,
}: ApprovalGuardProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [pinCode, setPinCode] = useState('')

  const handleTrigger = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsOpen(true)
  }

  const handleVerify = async () => {
    try {
      const res = (await apiFetch('/approvals/verify', {
        method: 'POST',
        body: JSON.stringify({ module, action, targetId, authCode: pinCode }),
      })) as { token?: string }

      toast.success(t('approval.guard.verifySuccess'))
      setIsOpen(false)
      onApproved(res.token)
    } catch (error) {
      failLoudly(error, 'ApprovalGuard.handleVerify')
    }
  }

  return (
    <>
      {React.cloneElement(children, {
        onClick: handleTrigger,
        disabled: children.props.disabled,
      })}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='rounded-[32px] border-none shadow-2xl sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-sm font-black tracking-tight uppercase italic'>
              <ShieldAlert className='h-4 w-4 text-primary' />
              {t('approval.guard.title')}
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-4 py-6'>
            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
              <p className='text-[11px] leading-relaxed font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('approval.guard.verifyDescription')}
              </p>
            </div>
            <div className='relative'>
              <KeyRound className='absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-primary opacity-40' />
              <Input
                className='h-14 rounded-2xl border-none bg-muted/50 pl-12 text-center font-mono text-2xl font-black tracking-[0.5em] transition-all focus-visible:ring-2 focus-visible:ring-primary/20'
                maxLength={6}
                placeholder='123456'
                value={pinCode}
                onChange={(event) =>
                  setPinCode(event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>

          <DialogFooter className='-mx-6 -mb-6 gap-2 rounded-b-[32px] bg-muted/30 p-4'>
            <Button
              variant='ghost'
              className='rounded-full text-[10px] font-black tracking-widest uppercase'
              onClick={() => setIsOpen(false)}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              disabled={pinCode.length !== 6}
              className='rounded-full px-6 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/20'
              onClick={handleVerify}
            >
              {t('approval.guard.verifyAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
