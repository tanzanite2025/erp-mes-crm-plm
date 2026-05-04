import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLanguage } from '@/context/language-provider'

interface EquipmentCategoryDeleteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    categoryName: string
    onConfirm: () => void
}

const CONFIRM_WORD = 'DELETE'

export function EquipmentCategoryDeleteDialog({
    open,
    onOpenChange,
    categoryName,
    onConfirm,
}: EquipmentCategoryDeleteDialogProps) {
    const { t } = useLanguage()
    const [value, setValue] = useState('')

    const handleDelete = () => {
        if (value.trim() !== CONFIRM_WORD) {
            return
        }
        onConfirm()
        onOpenChange(false)
        setValue('')
    }

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            handleConfirm={handleDelete}
            disabled={value.trim() !== CONFIRM_WORD}
            title={
                <span className='text-destructive flex items-center gap-2'>
                    <AlertTriangle className='size-5' />
                    {t('labExperimental.equipment.deleteDialog.title', { categoryName })}
                </span>
            }
            desc={
                <div className='space-y-4 pt-2'>
                    <p className='text-sm text-muted-foreground'>
                        {t('labExperimental.equipment.deleteDialog.confirmPrefix')} <span className='font-bold text-foreground'>"{categoryName}"</span> {t('labExperimental.equipment.deleteDialog.confirmSuffix')}<br />
                        {t('labExperimental.equipment.deleteDialog.deleteChildrenPrefix')} <span className='text-destructive font-bold'>{t('labExperimental.equipment.deleteDialog.childCategories')}</span>{t('labExperimental.equipment.deleteDialog.deleteChildrenSuffix')}
                    </p>

                    <Label className='space-y-2 flex flex-col items-start'>
                        <span className='text-[11px] font-bold uppercase text-muted-foreground'>
                            {t('labExperimental.equipment.deleteDialog.confirmWordPrompt', { confirmWord: CONFIRM_WORD })}
                        </span>
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={t('labExperimental.equipment.deleteDialog.confirmWordPlaceholder', {
                                confirmWord: CONFIRM_WORD,
                            })}
                            className='h-10 font-mono text-center tracking-widest'
                        />
                    </Label>

                    <Alert variant='destructive' className='border-destructive/50 bg-destructive/5'>
                        <AlertTitle className='text-xs font-black uppercase tracking-wider'>
                            {t('labExperimental.equipment.deleteDialog.dangerTitle')}
                        </AlertTitle>
                        <AlertDescription className='text-[10px] leading-relaxed opacity-80'>
                            {t('labExperimental.equipment.deleteDialog.dangerDescription')}
                        </AlertDescription>
                    </Alert>
                </div>
            }
            confirmText={t('labExperimental.equipment.deleteDialog.confirmAction')}
            destructive
        />
    )
}
