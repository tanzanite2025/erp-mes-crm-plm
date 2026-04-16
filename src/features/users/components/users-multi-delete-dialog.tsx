'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useUserMutations } from '../hooks/use-users'
import { type User } from '../data/schema'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'

const logger = createLogger('UsersMultiDeleteDialog')

type UserMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

const CONFIRM_WORD = 'DELETE'

export function UsersMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: UserMultiDeleteDialogProps<TData>) {
  const { t } = useLanguage()
  const [value, setValue] = useState('')
  const { deleteMutation } = useUserMutations()

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = async () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(t('users.dialogs.multiDelete.confirmHint', { word: CONFIRM_WORD }))
      return
    }

    const deletePromise = async () => {
      // 串行删除以保证本地存储状态一致性，避免并发写入竞态
      for (const row of selectedRows) {
        const user = row.original as User
        await deleteMutation.mutateAsync({ id: user.id, user })
      }
      await sleep(500) // 视觉停留，确保反馈平滑
    }

    toast.promise(deletePromise(), {
      loading: t('users.toast.multiDeleteSyncing', { count: selectedRows.length }),
      success: () => {
        onOpenChange(false)
        setValue('')
        table.resetRowSelection()
        return t('users.toast.multiDeleteSuccess', { count: selectedRows.length })
      },
      error: (err) => {
        logger.error('Bulk delete failed', err)
        return t('users.toast.protectedAccountActionFailed')
      },
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== CONFIRM_WORD}
      title={
        <span className='text-lg font-black italic uppercase tracking-tighter flex items-center gap-2 text-rose-600'>
          <AlertTriangle className='size-5' /> {t('users.dialogs.multiDelete.title')}
        </span>
      }
      desc={
        <div className='space-y-6 pt-2'>
          <div className='bg-rose-500/5 border border-dashed border-rose-500/20 p-4 rounded-2xl shadow-inner'>
            <p className='text-xs font-medium text-rose-900/70 leading-relaxed'>
              {t('users.dialogs.multiDelete.description', { count: selectedRows.length })}
            </p>
          </div>

          <div className='space-y-3 px-1'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2'>
              {t('users.dialogs.multiDelete.confirmHint', { word: CONFIRM_WORD })}
            </Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('users.dialogs.multiDelete.confirmPlaceholder', { word: CONFIRM_WORD })}
              className='h-12 rounded-2xl bg-muted/50 border-none shadow-inner font-black text-center text-lg tracking-[0.3em] uppercase focus-visible:ring-rose-500/20 transition-all'
            />
          </div>

          <Alert className='border-none bg-rose-500/10 rounded-2xl relative overflow-hidden'>
            <div className='absolute inset-0 bg-linear-to-r from-rose-500/10 via-transparent to-rose-500/5 animate-pulse' />
            <AlertTitle className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-rose-600 relative z-10'>
               <AlertTriangle size={14} className='animate-bounce' /> {t('users.dialogs.multiDelete.warningTitle')}
            </AlertTitle>
            <AlertDescription className='text-[9px] font-bold text-rose-600/70 relative z-10 uppercase tracking-tight'>
              {t('users.dialogs.multiDelete.warningDesc')}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('users.dialogs.multiDelete.button')}
      destructive
    />
  )
}
