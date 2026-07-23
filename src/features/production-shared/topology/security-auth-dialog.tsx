import { useState } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface SecurityAuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (password: string) => void | Promise<boolean | void>
  title?: string
  description?: string
}

export function SecurityAuthDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: SecurityAuthDialogProps) {
  const { t } = useLanguage()
  const finalTitle =
    title || t('orgPersonnel.lineMgmt.topology.authGenericTitle')
  const finalDescription =
    description || t('orgPersonnel.lineMgmt.topology.authGenericDesc')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPassword('')
      setIsSubmitting(false)
    }
    onOpenChange(nextOpen)
  }

  const handleVerify = async () => {
    if (password.trim().length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await onConfirm(password)
      if (result !== false) {
        handleOpenChange(false)
      }
    } catch {
      return
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      void handleVerify()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-[400px] rounded-[32px] border border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl dark:bg-popover/95'>
        <DialogHeader className='flex flex-col items-center gap-2'>
          <div className='mb-2 flex size-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10'>
            <Lock className='size-6 text-orange-500' />
          </div>
          <DialogTitle className='text-xl font-black tracking-tighter text-slate-900 italic dark:text-slate-100'>
            {finalTitle}
          </DialogTitle>
          <DialogDescription className='px-4 text-center text-[11px] leading-relaxed font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400'>
            {finalDescription}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 px-2 py-4'>
          <Input
            type='password'
            placeholder={t(
              'orgPersonnel.lineMgmt.topology.authPasswordPlaceholder'
            )}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={handleKeyDown}
            className='h-12 rounded-2xl border-none bg-slate-100 text-center font-mono text-lg tracking-[0.5em] transition-all focus:ring-2 focus:ring-orange-500 dark:bg-white/6 dark:text-slate-100'
            autoFocus
          />
        </div>

        <DialogFooter className='mt-2 gap-2 sm:justify-center'>
          <Button
            variant='ghost'
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className='h-11 flex-1 rounded-full bg-slate-100 text-[10px] font-bold tracking-widest uppercase transition-all hover:bg-slate-200 dark:bg-white/6 dark:hover:bg-white/10'
          >
            {t('orgPersonnel.lineMgmt.dialog.cancel')}
          </Button>
          <Button
            onClick={() => void handleVerify()}
            disabled={password.trim().length === 0 || isSubmitting}
            className='h-11 flex-1 gap-2 rounded-full bg-slate-900 text-[10px] font-bold tracking-widest text-white uppercase shadow-lg transition-all hover:bg-black'
          >
            <ShieldCheck className='size-4' />
            {t('orgPersonnel.lineMgmt.topology.authVerify')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
