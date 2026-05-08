import { ConfirmDialog } from '@/components/confirm-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface StandardStatusActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  fieldLabel: string
  placeholder: string
  confirmText: string
  cancelText?: string
  value: string
  onValueChange: (value: string) => void
  isLoading?: boolean
  required?: boolean
}

export function StandardStatusActionDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  fieldLabel,
  placeholder,
  confirmText,
  cancelText,
  value,
  onValueChange,
  isLoading = false,
  required = false,
}: StandardStatusActionDialogProps) {
  const trimmedValue = value.trim()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      desc={description}
      confirmText={confirmText}
      cancelBtnText={cancelText}
      isLoading={isLoading}
      disabled={required && trimmedValue.length === 0}
      handleConfirm={onConfirm}
    >
      <div className='space-y-2'>
        <Label className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
          {fieldLabel}
        </Label>
        <Textarea
          rows={5}
          placeholder={placeholder}
          className='rounded-2xl border-none bg-muted/50 p-4 text-sm shadow-inner transition-all focus:ring-2 focus:ring-primary/20'
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </div>
    </ConfirmDialog>
  )
}
