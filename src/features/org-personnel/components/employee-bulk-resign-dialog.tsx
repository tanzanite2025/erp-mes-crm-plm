'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'

type EmployeeBulkResignDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
  onResign?: (items: TData[]) => Promise<number>
}

export function EmployeeBulkResignDialog<TData>({
  open,
  onOpenChange,
  table,
  onResign,
}: EmployeeBulkResignDialogProps<TData>) {
  const { t } = useLanguage()
  const CONFIRM_WORD = t('common.actions.delete') || 'DELETE'
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleConfirm = async () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(
        t('orgPersonnel.list.bulk.resignDialog.confirmError', {
          word: CONFIRM_WORD,
        })
      )
      return
    }

    if (!onResign) {
      toast.error(t('orgPersonnel.list.bulk.notEnabled'))
      return
    }

    const selectedItems = selectedRows.map((row) => row.original as TData)
    if (selectedItems.length === 0) {
      toast.error(t('orgPersonnel.list.bulk.resignDialog.selectRequired'))
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await onResign(selectedItems)
      onOpenChange(false)
      setValue('')
      table.resetRowSelection()
      toast.success(
        t('orgPersonnel.list.bulk.resignDialog.success', {
          count: updated || selectedItems.length,
        })
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('orgPersonnel.list.bulk.resignDialog.failure')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(state) => {
        setValue('')
        onOpenChange(state)
      }}
      handleConfirm={() => {
        void handleConfirm()
      }}
      disabled={value.trim() !== CONFIRM_WORD || isSubmitting}
      isLoading={isSubmitting}
      cancelBtnText={t('common.actions.cancel')}
      title={
        <span className='text-start leading-tight [overflow-wrap:anywhere] break-words whitespace-normal'>
          <UserX className='me-2 inline-block' size={18} />
          {t('orgPersonnel.list.bulk.resignDialog.title', {
            count: selectedRows.length,
          })}
        </span>
      }
      desc={
        <div className='flex animate-in flex-col gap-6 text-start duration-500 fade-in'>
          <p className='text-sm leading-relaxed font-medium opacity-90'>
            {t('orgPersonnel.list.bulk.resignDialog.desc')}
          </p>

          <Label className='flex flex-col items-start gap-3'>
            <span className='text-[10px] font-black tracking-[0.14em] [overflow-wrap:anywhere] break-words whitespace-normal opacity-50'>
              {t('orgPersonnel.list.bulk.resignDialog.confirmWordLabel', {
                word: CONFIRM_WORD,
              })}
            </span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t(
                'orgPersonnel.list.bulk.resignDialog.confirmPlaceholder',
                { word: CONFIRM_WORD }
              )}
              className='h-12 rounded-2xl border-none bg-muted/40 px-4 transition-all focus-visible:ring-1 focus-visible:ring-destructive/30'
            />
          </Label>

          <Alert
            variant='destructive'
            className='rounded-[20px] border-dashed border-destructive/20 bg-destructive/5'
          >
            <AlertTitle className='flex items-center gap-2 text-[11px] font-black tracking-[0.12em] [overflow-wrap:anywhere] break-words whitespace-normal'>
              <AlertTriangle className='size-3.5' />
              {t('orgPersonnel.list.bulk.resignDialog.warningTitle')}
            </AlertTitle>
            <AlertDescription className='mt-1 text-[11px] leading-relaxed font-semibold [overflow-wrap:anywhere] break-words whitespace-normal opacity-70'>
              {t('orgPersonnel.list.bulk.resignDialog.warningDesc')}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('orgPersonnel.list.bulk.resignDialog.submit')}
      destructive
    />
  )
}
