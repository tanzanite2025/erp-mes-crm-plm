import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProductTemplateAttributeCatalogRequestState } from '@/features/engineering/components/product-attributes/product-template-attribute-catalog-request-state'
import { ProductTemplateAttributeLevelTwoOptionEditorDialog } from '@/features/engineering/components/product-attributes/product-template-attribute-level-two-option-editor-dialog'
import { type ProductTemplateAttributeLevelTwoOption } from '@/features/engineering/data/schema'
import { useProductAttributeCatalogQueries } from '@/features/engineering/hooks/use-product-attribute-catalog-queries'
import { useProductAttributeWriteActions } from '@/features/engineering/hooks/use-product-attribute-write-actions'
import { areSameProductAttributeCategoryKey } from '@/features/engineering/utils/product-attribute-machine-value'
import { getProductTemplateAttributeLevelTwoOptionLabel } from '@/features/engineering/utils/product-attribute-utils'

interface BOMGradeOptionManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BOMGradeOptionManagementDialog(
  props: BOMGradeOptionManagementDialogProps
) {
  if (!props.open) return null
  return <BOMGradeOptionManagementDialogSession {...props} />
}

function BOMGradeOptionManagementDialogSession({
  open,
  onOpenChange,
}: BOMGradeOptionManagementDialogProps) {
  const { locale } = useLanguage()
  const isZh = locale.startsWith('zh')
  const { options, isLoading, error, retry } =
    useProductAttributeCatalogQueries()
  const { deleteOption, isDeletingOption } = useProductAttributeWriteActions()
  const [editor, setEditor] = useState<{
    option?: ProductTemplateAttributeLevelTwoOption
  } | null>(null)
  const gradeOptions = options.filter((option) =>
    areSameProductAttributeCategoryKey(option.categoryKey, 'versionLevel')
  )

  async function deleteUnusedBOMGradeOption(
    option: ProductTemplateAttributeLevelTwoOption
  ) {
    try {
      await deleteOption(option.id)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isZh
            ? '删除失败'
            : 'Delete failed'
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!editor && !isDeletingOption) onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        size='2xl'
        className='flex max-h-[90dvh] flex-col [&_[data-slot=button]]:rounded-full'
      >
        <DialogHeader>
          <DialogTitle>
            {isZh ? '产品档次选项' : 'Product grade options'}
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? '维护 BOM 中可选择的产品档次。具体产品的档次仍在 BOM 中填写，模板属性各自独立维护。'
              : 'Maintain grade choices for BOMs. Select a product’s grade in its BOM. Template attributes are maintained independently.'}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 space-y-3 overflow-y-auto'>
          <ProductTemplateAttributeCatalogRequestState
            isLoading={isLoading}
            error={error}
            onRetry={() => void retry()}
          />
          {gradeOptions.map((option) => (
            <div
              key={option.id}
              className='flex items-center justify-between gap-3 rounded-xl border p-3'
            >
              <span className='text-sm'>
                {getProductTemplateAttributeLevelTwoOptionLabel(locale, option)}
                {!option.active && (isZh ? '（已停用）' : ' (disabled)')}
              </span>
              <div className='flex gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label={
                    isZh ? `编辑${option.labelZh}` : `Edit ${option.labelZh}`
                  }
                  onClick={() => setEditor({ option })}
                >
                  <Pencil className='size-4' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={isDeletingOption}
                  aria-label={
                    isZh ? `删除${option.labelZh}` : `Delete ${option.labelZh}`
                  }
                  onClick={() => void deleteUnusedBOMGradeOption(option)}
                >
                  <Trash2 className='size-4' />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            disabled={isLoading || Boolean(error)}
            onClick={() => setEditor({})}
          >
            <Plus className='size-4' />
            {isZh ? '添加档次选项' : 'Add grade option'}
          </Button>
        </div>
        {editor && (
          <ProductTemplateAttributeLevelTwoOptionEditorDialog
            open
            categoryKey='versionLevel'
            option={editor.option}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setEditor(null)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
