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
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import {
  ProductTemplateAttributeClassificationManagementPanel,
  type ProductTemplateAttributeClassificationManagementPanelProps,
} from './product-template-attribute-classification-management-panel'

const productTemplateAttributeManagementDialogClasses =
  buildActionDialogShellClasses({
    content:
      'flex max-h-[90dvh] flex-col gap-0 rounded-[24px] sm:rounded-[32px] [&_[data-slot=button]]:rounded-full',
    header: 'px-5 py-5 pr-16 text-start sm:px-8 sm:py-6 sm:pr-16',
    title: 'text-base text-primary sm:text-lg',
    description:
      'text-[11px] leading-relaxed font-bold tracking-normal normal-case',
    body: 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-6',
    footer: 'shrink-0 flex-row justify-end px-5 py-4 sm:px-8 sm:py-5',
  })

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
        className={productTemplateAttributeManagementDialogClasses.content}
        closeButtonClassName='top-5 end-5 flex size-8 items-center justify-center rounded-full bg-muted/60 sm:top-6 sm:end-6'
      >
        <DialogHeader
          className={productTemplateAttributeManagementDialogClasses.header}
        >
          <DialogTitle
            className={productTemplateAttributeManagementDialogClasses.title}
          >
            {isZh
              ? '产品模板属性分类管理'
              : 'Product Template Attribute Category Management'}
          </DialogTitle>
          <DialogDescription
            className={
              productTemplateAttributeManagementDialogClasses.description
            }
          >
            {isZh
              ? '维护产品模板的一级属性分类和二级属性分类（属性选项），完成后可继续当前操作。'
              : 'Manage level 1 attribute categories and level 2 attribute options for product templates, then continue your current task.'}
          </DialogDescription>
        </DialogHeader>
        <div className={productTemplateAttributeManagementDialogClasses.body}>
          {open && (
            <ProductTemplateAttributeClassificationManagementPanel
              initialLevelOneCategoryKey={initialLevelOneCategoryKey}
              onLevelTwoOptionSaved={onLevelTwoOptionSaved}
            />
          )}
        </div>
        <DialogFooter
          className={productTemplateAttributeManagementDialogClasses.footer}
        >
          <Button
            type='button'
            className='h-11 rounded-full px-6 text-[11px] font-black'
            onClick={() => onOpenChange(false)}
          >
            {isZh ? '完成' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
