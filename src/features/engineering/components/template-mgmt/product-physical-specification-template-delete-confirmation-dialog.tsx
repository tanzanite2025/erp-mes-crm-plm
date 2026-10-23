import { useId, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface ProductPhysicalSpecificationTemplateDeleteConfirmationDialogProps {
  locale: string
  targetName: string
  targetKind: 'template' | 'attribute' | 'option'
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ProductPhysicalSpecificationTemplateDeleteConfirmationDialog({
  locale,
  targetName,
  targetKind,
  isDeleting = false,
  onOpenChange,
  onConfirm,
}: ProductPhysicalSpecificationTemplateDeleteConfirmationDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('')
  const confirmationInputId = useId()
  const isZh = locale.startsWith('zh')
  const targetKindLabel = isZh
    ? { template: '物理规格模板', attribute: '规格属性', option: '规格选项' }[
        targetKind
      ]
    : {
        template: 'specification template',
        attribute: 'attribute',
        option: 'option',
      }[targetKind]
  const isConfirmed = confirmationInput.trim() === 'DELETE'

  return (
    <ConfirmDialog
      open
      className='product-physical-specification-template-floating-surface z-103 max-h-[94dvh] overflow-y-auto'
      overlayClassName='z-102'
      onOpenChange={(open) => {
        if (!isDeleting) onOpenChange(open)
      }}
      title={
        <span className='flex items-center gap-2 text-destructive'>
          <AlertTriangle className='size-5 shrink-0' />
          {isZh ? `删除${targetKindLabel}` : `Delete ${targetKindLabel}`}
        </span>
      }
      desc={
        <div className='space-y-3 text-sm leading-relaxed text-muted-foreground'>
          <p>
            {isZh ? `确认删除“${targetName}”？` : `Delete “${targetName}”?`}
          </p>
          {targetKind === 'attribute' && (
            <p>
              {isZh
                ? '该属性下的全部选项会同时移除。'
                : 'All options under this attribute will also be removed.'}
            </p>
          )}
          <p>
            {targetKind === 'template'
              ? isZh
                ? '确认后立即删除模板，此操作无法撤销。'
                : 'The template will be deleted immediately. This cannot be undone.'
              : isZh
                ? '确认后从当前编辑草稿移除，点击“保存模板”后生效；取消编辑可撤销。已有产品使用的内容请改为停用。'
                : 'Remove from this draft, then save the template to apply. Cancel editing to discard changes. Disable definitions already used by products.'}
          </p>
        </div>
      }
      confirmText={isZh ? '确认删除' : 'Confirm deletion'}
      cancelBtnText={isZh ? '取消' : 'Cancel'}
      disabled={!isConfirmed}
      isLoading={isDeleting}
      destructive
      handleConfirm={() => {
        if (isConfirmed && !isDeleting) onConfirm()
      }}
    >
      <div className='space-y-2'>
        <Label htmlFor={confirmationInputId} className='text-xs'>
          {isZh ? '输入 DELETE 确认删除' : 'Type DELETE to confirm deletion'}
        </Label>
        <Input
          id={confirmationInputId}
          autoComplete='off'
          spellCheck={false}
          disabled={isDeleting}
          placeholder='DELETE'
          value={confirmationInput}
          onChange={(event) => setConfirmationInput(event.target.value)}
          className='h-11 rounded-xl border-input/60 bg-muted/20 text-center font-semibold tracking-widest shadow-none'
        />
      </div>
    </ConfirmDialog>
  )
}
