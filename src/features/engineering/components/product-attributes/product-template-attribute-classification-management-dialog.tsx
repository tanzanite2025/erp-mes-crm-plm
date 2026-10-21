import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ProductTemplateAttributeClassificationManagementPanel,
  type ProductTemplateAttributeClassificationManagementPanelProps,
} from './product-template-attribute-classification-management-panel'

export interface ProductTemplateAttributeClassificationManagementDialogProps extends ProductTemplateAttributeClassificationManagementPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductTemplateAttributeClassificationManagementDialog({
  open,
  onOpenChange,
  initialLevelOneCategoryKey,
  onLevelTwoOptionSaved,
}: ProductTemplateAttributeClassificationManagementDialogProps) {
  const { locale } = useLanguage()
  const isZh = locale === 'zh-CN'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='6xl'
        className='flex flex-col gap-0 overflow-hidden rounded-3xl p-0'
      >
        <DialogHeader className='shrink-0 border-b px-6 py-5 text-start'>
          <DialogTitle>
            {isZh
              ? '产品模板属性分类管理'
              : 'Product Template Attribute Category Management'}
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? '维护产品模板的一级属性分类和二级属性分类（属性选项），完成后可继续当前操作。'
              : 'Manage level 1 attribute categories and level 2 attribute options for product templates, then continue your current task.'}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
          {open && (
            <ProductTemplateAttributeClassificationManagementPanel
              initialLevelOneCategoryKey={initialLevelOneCategoryKey}
              onLevelTwoOptionSaved={onLevelTwoOptionSaved}
            />
          )}
        </div>
        <DialogFooter className='shrink-0 border-t px-6 py-4'>
          <Button onClick={() => onOpenChange(false)}>
            {isZh ? '完成' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
