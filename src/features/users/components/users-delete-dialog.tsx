'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'
import { useUserMutations } from '../hooks/use-users'
import { useLanguage } from '@/context/language-provider'
import { toast } from 'sonner'

type UserDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: UserDeleteDialogProps) {
  const { t } = useLanguage()
  const [value, setValue] = useState('')
  const { deleteMutation } = useUserMutations()
  const CONFIRM_WORD = 'DELETE'

  const handleDelete = () => {
    if (value.trim() !== CONFIRM_WORD) return

    deleteMutation.mutate({ id: currentRow.id, user: currentRow }, {
      onSuccess: () => {
        onOpenChange(false)
        setValue('')
        toast.success(t('users.toast.deleteSuccess'))
      }
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      title={
        <span className='text-lg font-black italic uppercase tracking-tighter flex items-center gap-2 text-rose-600'>
          <AlertTriangle className='size-5' /> {t('users.dialogs.delete.title')}
        </span>
      }
      desc={
        <div className='space-y-6 pt-2'>
          <div className='bg-rose-500/5 border border-dashed border-rose-500/20 p-4 rounded-2xl shadow-inner'>
            <p className='text-xs font-medium text-rose-900/70 leading-relaxed'>
              {t('users.dialogs.delete.description', { name: currentRow.username })}
            </p>
          </div>

          <div className='space-y-3 px-1'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2'>
              {t('users.dialogs.delete.confirmHint', { word: CONFIRM_WORD })}
            </Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('users.dialogs.delete.confirmPlaceholder', { word: CONFIRM_WORD })}
              className='h-12 rounded-2xl bg-muted/50 border-none shadow-inner font-black text-center text-lg tracking-[0.3em] uppercase focus-visible:ring-rose-500/20 transition-all'
            />
          </div>

          <Alert className='border-none bg-rose-500/10 rounded-2xl relative overflow-hidden'>
            <div className='absolute inset-0 bg-gradient-to-r from-rose-500/10 via-transparent to-rose-500/5 animate-pulse' />
            <AlertTitle className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-rose-600 relative z-10'>
               <AlertTriangle size={14} className='animate-bounce' /> {t('users.dialogs.delete.warningTitle')}
            </AlertTitle>
            <AlertDescription className='text-[9px] font-bold text-rose-600/70 relative z-10 uppercase tracking-tight'>
              {t('users.dialogs.delete.warningDesc')}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('users.dialogs.delete.button')}
      disabled={value.trim() !== CONFIRM_WORD}
      destructive
    />
  )
}
