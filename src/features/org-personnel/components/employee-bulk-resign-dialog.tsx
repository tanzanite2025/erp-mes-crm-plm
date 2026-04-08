'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLanguage } from '@/context/language-provider'

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
    const CONFIRM_WORD = t('common.actions.delete' as any) || 'DELETE'
    const [value, setValue] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const selectedRows = table.getFilteredSelectedRowModel().rows

    const handleConfirm = async () => {
        if (value.trim() !== CONFIRM_WORD) {
            toast.error(t('orgPersonnel.list.bulk.resignDialog.confirmError' as any, { word: CONFIRM_WORD }))
            return
        }

        if (!onResign) {
            toast.error(t('orgPersonnel.list.bulk.notEnabled' as any))
            return
        }

        const selectedItems = selectedRows.map((row) => row.original as TData)
        if (selectedItems.length === 0) {
            toast.error(t('orgPersonnel.list.bulk.resignDialog.selectRequired' as any))
            onOpenChange(false)
            return
        }

        setIsSubmitting(true)
        try {
            const updated = await onResign(selectedItems)
            onOpenChange(false)
            setValue('')
            table.resetRowSelection()
            toast.success(t('orgPersonnel.list.bulk.resignDialog.success' as any, { count: updated || selectedItems.length }))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('orgPersonnel.list.bulk.resignDialog.failure' as any))
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
            cancelBtnText={t('common.actions.cancel' as any)}
            title={
                <>
                    <UserX
                        className='me-2 inline-block'
                        size={18}
                    />
                    {t('orgPersonnel.list.bulk.resignDialog.title' as any, {
                        count: selectedRows.length,
                    })}
                </>
            }
            desc={
                <div className='flex flex-col gap-6 text-start animate-in fade-in duration-500'>
                    <p className='text-sm font-medium opacity-90 leading-relaxed'>
                        {t('orgPersonnel.list.bulk.resignDialog.desc' as any)}
                    </p>

                    <Label className='flex flex-col items-start gap-3'>
                        <span className='text-[10px] font-black uppercase tracking-widest opacity-50'>
                            {t('orgPersonnel.list.bulk.resignDialog.confirmWordLabel' as any, {
                                word: CONFIRM_WORD,
                            })}
                        </span>
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={t(
                                'orgPersonnel.list.bulk.resignDialog.confirmPlaceholder' as any,
                                { word: CONFIRM_WORD }
                            )}
                            className='h-12 rounded-2xl bg-muted/40 border-none px-4 focus-visible:ring-1 focus-visible:ring-destructive/30 transition-all'
                        />
                    </Label>

                    <Alert
                        variant='destructive'
                        className='border-dashed rounded-[20px] bg-destructive/5 border-destructive/20'
                    >
                        <AlertTitle className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2'>
                            <AlertTriangle className='size-3.5' />
                            {t('orgPersonnel.list.bulk.resignDialog.warningTitle' as any)}
                        </AlertTitle>
                        <AlertDescription className='text-[9px] font-bold uppercase tracking-widest opacity-70 mt-1 leading-normal'>
                            {t('orgPersonnel.list.bulk.resignDialog.warningDesc' as any)}
                        </AlertDescription>
                    </Alert>
                </div>
            }
            confirmText={t('orgPersonnel.list.bulk.resignDialog.submit' as any)}
            destructive
        />
    )
}
