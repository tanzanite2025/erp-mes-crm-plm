import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'

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
                    删除设备分类: {categoryName}
                </span>
            }
            desc={
                <div className='space-y-4 pt-2'>
                    <p className='text-sm text-muted-foreground'>
                        您确定要删除 <span className='font-bold text-foreground'>"{categoryName}"</span> 吗？<br />
                        此操作将同时删除其下的所有 <span className='text-destructive font-bold'>子分类</span>，且不可撤销。
                    </p>

                    <Label className='space-y-2 flex flex-col items-start'>
                        <span className='text-[11px] font-bold uppercase text-muted-foreground'>请输入 "{CONFIRM_WORD}" 以确认操作：</span>
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={`在此键入 "${CONFIRM_WORD}"`}
                            className='h-10 font-mono text-center tracking-widest'
                        />
                    </Label>

                    <Alert variant='destructive' className='border-destructive/50 bg-destructive/5'>
                        <AlertTitle className='text-xs font-black uppercase tracking-wider'>高危操作警告</AlertTitle>
                        <AlertDescription className='text-[10px] leading-relaxed opacity-80'>
                            删除顶级分类会导致该分支下的整个层级结构丢失。建议在操作前确认无误。
                        </AlertDescription>
                    </Alert>
                </div>
            }
            confirmText='确认删除此分类'
            destructive
        />
    )
}
