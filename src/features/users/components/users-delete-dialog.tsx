'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'
import { useUserMutations } from '../hooks/use-users'

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

    deleteMutation.mutate(
      { id: currentRow.id, user: currentRow },
      {
        onSuccess: () => {
          onOpenChange(false)
          setValue('')
          toast.success(t('users.toast.deleteSuccess'))
        },
      }
    )
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      title={
        <span className='flex items-center gap-2 text-lg font-black tracking-tighter text-rose-600 uppercase italic'>
          <AlertTriangle className='size-5' /> {t('users.dialogs.delete.title')}
        </span>
      }
      desc={
        <div className='space-y-6 pt-2'>
          <div className='rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/5 p-4 shadow-inner'>
            <p className='text-xs leading-relaxed font-medium text-rose-900/70'>
              {t('users.dialogs.delete.description', {
                name: currentRow.username,
              })}
            </p>
          </div>

          <div className='space-y-3 px-1'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('users.dialogs.delete.confirmHint', { word: CONFIRM_WORD })}
            </Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('users.dialogs.delete.confirmPlaceholder', {
                word: CONFIRM_WORD,
              })}
              className='h-12 rounded-2xl border-none bg-muted/50 text-center text-lg font-black tracking-[0.3em] uppercase shadow-inner transition-all focus-visible:ring-rose-500/20'
            />
          </div>

          <Alert className='relative overflow-hidden rounded-2xl border-none bg-rose-500/10'>
            <div className='absolute inset-0 animate-pulse bg-gradient-to-r from-rose-500/10 via-transparent to-rose-500/5' />
            <AlertTitle className='relative z-10 flex items-center gap-2 text-[10px] font-black tracking-widest text-rose-600 uppercase'>
              <AlertTriangle size={14} className='animate-bounce' />{' '}
              {t('users.dialogs.delete.warningTitle')}
            </AlertTitle>
            <AlertDescription className='relative z-10 text-[9px] font-bold tracking-tight text-rose-600/70 uppercase'>
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
