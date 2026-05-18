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
import { useLanguage } from '@/context/language-provider'

type EmployeeMultiDeleteDialogProps<TData> = {
    open: boolean
    onOpenChange: (open: boolean) => void
    table: Table<TData>
    onDelete?: (items: TData[]) => void
}

export function EmployeeMultiDeleteDialog<TData>({
    open,
    onOpenChange,
    table,
    onDelete,
}: EmployeeMultiDeleteDialogProps<TData>) {
    const { t } = useLanguage()
    const CONFIRM_WORD = t('common.actions.delete') || 'DELETE'
    const [value, setValue] = useState('')

    const selectedRows = table.getFilteredSelectedRowModel().rows

    const handleDelete = () => {
        if (value.trim() !== CONFIRM_WORD) {
            toast.error(t('orgPersonnel.list.bulk.deleteDialog.confirmError', { word: CONFIRM_WORD }))
            return
        }

        onOpenChange(false)

        toast.promise(sleep(2000), {
            loading: t('orgPersonnel.list.bulk.deleteDialog.loading'),
            success: () => {
                setValue('')
                if (onDelete) {
                    onDelete(selectedRows.map((row) => row.original))
                }
                table.resetRowSelection()
                return t('orgPersonnel.list.bulk.deleteDialog.success', { count: selectedRows.length })
            },
            error: t('orgPersonnel.list.bulk.deleteDialog.failure'),
        })
    }

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={(state) => {
                setValue('')
                onOpenChange(state)
            }}
            handleConfirm={handleDelete}
            disabled={value.trim() !== CONFIRM_WORD}
            title={
                <span className='text-destructive text-start leading-tight whitespace-normal break-words [overflow-wrap:anywhere]'>
                    <AlertTriangle
                        className='me-1 inline-block stroke-destructive'
                        size={18}
                    />{' '}
                    {t('orgPersonnel.list.bulk.deleteDialog.title', { count: selectedRows.length })}
                </span>
            }
            desc={
                <div className='space-y-4 text-start'>
                    <p className='mb-2 text-sm opacity-80'>
                        {t('orgPersonnel.list.bulk.deleteDialog.desc')}
                    </p>

                    <Label className='my-4 flex flex-col items-start gap-2'>
                        <span className='text-[10px] font-black tracking-[0.14em] opacity-60 whitespace-normal break-words [overflow-wrap:anywhere]'>{t('orgPersonnel.list.bulk.deleteDialog.confirmWordLabel', { word: CONFIRM_WORD })}</span>
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={t('orgPersonnel.list.bulk.deleteDialog.confirmPlaceholder', { word: CONFIRM_WORD })}
                            className='h-11 rounded-2xl bg-muted/50 border-none'
                        />
                    </Label>

                    <Alert variant='destructive'>
                        <AlertTitle className='text-[11px] font-black tracking-[0.12em] whitespace-normal break-words [overflow-wrap:anywhere]'>
                            {t('orgPersonnel.list.bulk.deleteDialog.warningTitle')}
                        </AlertTitle>
                        <AlertDescription className='text-[11px] font-semibold leading-relaxed opacity-80 whitespace-normal break-words [overflow-wrap:anywhere]'>
                            {t('orgPersonnel.list.bulk.deleteDialog.warningDesc')}
                        </AlertDescription>
                    </Alert>
                </div>
            }
            confirmText={t('orgPersonnel.list.bulk.deleteDialog.submit')}
            destructive
            cancelBtnText={t('common.actions.cancel')}
        />
    )
}
