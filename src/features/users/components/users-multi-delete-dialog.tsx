'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { sleep } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'
import { useUserMutations } from '../hooks/use-users'

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
      toast.error(
        t('users.dialogs.multiDelete.confirmHint', { word: CONFIRM_WORD })
      )
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
      loading: t('users.toast.multiDeleteSyncing', {
        count: selectedRows.length,
      }),
      success: () => {
        onOpenChange(false)
        setValue('')
        table.resetRowSelection()
        return t('users.toast.multiDeleteSuccess', {
          count: selectedRows.length,
        })
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
        <span className='flex items-center gap-2 text-lg font-black tracking-tighter text-rose-600 uppercase italic'>
          <AlertTriangle className='size-5' />{' '}
          {t('users.dialogs.multiDelete.title')}
        </span>
      }
      desc={
        <div className='space-y-6 pt-2'>
          <div className='rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/5 p-4 shadow-inner'>
            <p className='text-xs leading-relaxed font-medium text-rose-900/70'>
              {t('users.dialogs.multiDelete.description', {
                count: selectedRows.length,
              })}
            </p>
          </div>

          <div className='space-y-3 px-1'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('users.dialogs.multiDelete.confirmHint', {
                word: CONFIRM_WORD,
              })}
            </Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('users.dialogs.multiDelete.confirmPlaceholder', {
                word: CONFIRM_WORD,
              })}
              className='h-12 rounded-2xl border-none bg-muted/50 text-center text-lg font-black tracking-[0.3em] uppercase shadow-inner transition-all focus-visible:ring-rose-500/20'
            />
          </div>

          <Alert className='relative overflow-hidden rounded-2xl border-none bg-rose-500/10'>
            <div className='absolute inset-0 animate-pulse bg-linear-to-r from-rose-500/10 via-transparent to-rose-500/5' />
            <AlertTitle className='relative z-10 flex items-center gap-2 text-[10px] font-black tracking-widest text-rose-600 uppercase'>
              <AlertTriangle size={14} className='animate-bounce' />{' '}
              {t('users.dialogs.multiDelete.warningTitle')}
            </AlertTitle>
            <AlertDescription className='relative z-10 text-[9px] font-bold tracking-tight text-rose-600/70 uppercase'>
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
