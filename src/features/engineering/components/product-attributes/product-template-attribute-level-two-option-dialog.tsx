import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { type ProductTemplateAttributeLevelOneCategory } from '../../data/schema'
import { type SaveProductTemplateAttributeLevelTwoOptionInput } from '../../mutation-types'
import { areSameProductAttributeCategoryKey } from '../../utils/product-attribute-machine-value'

const productTemplateAttributeOptionDialogClasses =
  buildActionDialogShellClasses({
    content:
      'flex max-h-[90dvh] flex-col gap-0 [&_[data-slot=button]]:rounded-full',
    header: 'px-6 py-5 pr-16 text-start',
    title: 'text-base text-primary sm:text-lg',
    description:
      'text-[11px] leading-relaxed font-bold tracking-normal normal-case',
    body: 'min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5',
    footer: 'shrink-0 flex-row justify-end px-6 py-4',
  })

interface ProductTemplateAttributeLevelTwoOptionDialogProps {
  locale: string
  open: boolean
  option: SaveProductTemplateAttributeLevelTwoOptionInput
  isSaving: boolean
  categoryLocked?: boolean
  isCatalogReady?: boolean
  catalogRequestState?: ReactNode
  categories: ProductTemplateAttributeLevelOneCategory[]
  getLocalizedCategoryName: (
    locale: string,
    category: ProductTemplateAttributeLevelOneCategory
  ) => string
  onOpenChange: (open: boolean) => void
  onOptionChange: (
    updater: (
      prev: SaveProductTemplateAttributeLevelTwoOptionInput
    ) => SaveProductTemplateAttributeLevelTwoOptionInput
  ) => void
  onSave: () => void
}

export function ProductTemplateAttributeLevelTwoOptionDialog({
  locale,
  open,
  option,
  isSaving,
  categoryLocked = false,
  isCatalogReady = true,
  catalogRequestState,
  categories,
  getLocalizedCategoryName,
  onOpenChange,
  onOptionChange,
  onSave,
}: ProductTemplateAttributeLevelTwoOptionDialogProps) {
  const isZh = locale === 'zh-CN'
  const isBOMGradeOption = areSameProductAttributeCategoryKey(
    option.categoryKey,
    'versionLevel'
  )
  const optionFormId = useId()
  const categoryFieldId = `${optionFormId}-category`
  const chineseNameFieldId = `${optionFormId}-chinese-name`
  const englishNameFieldId = `${optionFormId}-english-name`
  const descriptionFieldId = `${optionFormId}-description`
  const activeStatusFieldId = `${optionFormId}-active`
  const activeStatusDescriptionId = `${optionFormId}-active-description`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='2xl'
        className={productTemplateAttributeOptionDialogClasses.content}
        closeButtonClassName='top-5 end-5 flex size-8 items-center justify-center rounded-full bg-muted/60'
      >
        <DialogHeader
          className={productTemplateAttributeOptionDialogClasses.header}
        >
          <DialogTitle
            className={productTemplateAttributeOptionDialogClasses.title}
          >
            {isBOMGradeOption
              ? option.id
                ? isZh
                  ? '编辑性能版本选项'
                  : 'Edit performance version option'
                : isZh
                  ? '新增性能版本选项'
                  : 'Add performance version option'
              : option.id
                ? isZh
                  ? '编辑二级属性分类'
                  : 'Edit Level 2 Attribute Category'
                : isZh
                  ? '新增二级属性分类'
                  : 'Create Level 2 Attribute Category'}
          </DialogTitle>
          <DialogDescription
            className={productTemplateAttributeOptionDialogClasses.description}
          >
            {isBOMGradeOption
              ? isZh
                ? '维护 BOM 中可选择的性能版本。具体产品的性能版本在 BOM 中选择。'
                : 'Maintain performance version choices for BOMs. Select the product’s performance version in its BOM.'
              : isZh
                ? '为所属一级属性分类维护可选项，例如“材质”下的“碳纤维”，供产品模板对应的属性字段选择。'
                : 'Define an option under a level 1 attribute category, such as Carbon Fiber under Material, for the corresponding product template field.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id={optionFormId}
          className={productTemplateAttributeOptionDialogClasses.body}
          onSubmit={(event) => {
            event.preventDefault()
            if (!isSaving && isCatalogReady) onSave()
          }}
        >
          {catalogRequestState}
          <fieldset
            disabled={isSaving || !isCatalogReady}
            className='min-w-0 space-y-5'
          >
            <div className='space-y-2'>
              <Label htmlFor={categoryFieldId} className='text-sm font-medium'>
                {isBOMGradeOption
                  ? isZh
                    ? '所属性能版本分类'
                    : 'Performance version category'
                  : isZh
                    ? '所属一级属性分类'
                    : 'Parent Level 1 Attribute Category'}
              </Label>
              <Select
                value={option.categoryKey || ''}
                onValueChange={(value) =>
                  onOptionChange((prev) => ({ ...prev, categoryKey: value }))
                }
                disabled={categoryLocked || Boolean(option.id)}
              >
                <SelectTrigger
                  id={categoryFieldId}
                  className='w-full rounded-xl border-input/60 bg-muted/20 text-sm font-medium shadow-none data-[size=default]:h-11'
                >
                  <SelectValue
                    placeholder={
                      isZh
                        ? '选择一级属性分类'
                        : 'Select Level 1 Attribute Category'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.key}>
                      {getLocalizedCategoryName(locale, category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label
                  htmlFor={chineseNameFieldId}
                  className='text-sm font-medium'
                >
                  {isZh ? '中文名称' : 'Chinese label'}
                  <span aria-hidden='true' className='text-destructive'>
                    *
                  </span>
                </Label>
                <Input
                  id={chineseNameFieldId}
                  autoFocus
                  required
                  maxLength={255}
                  className='h-11 rounded-xl border-input/60 bg-muted/20 shadow-none'
                  value={option.labelZh || ''}
                  onChange={(event) =>
                    onOptionChange((prev) => ({
                      ...prev,
                      labelZh: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label
                  htmlFor={englishNameFieldId}
                  className='text-sm font-medium'
                >
                  {isZh ? '英文名称' : 'English label'}
                  <span className='text-xs font-normal text-muted-foreground'>
                    {isZh ? '（选填）' : '(optional)'}
                  </span>
                </Label>
                <Input
                  id={englishNameFieldId}
                  maxLength={255}
                  className='h-11 rounded-xl border-input/60 bg-muted/20 shadow-none'
                  value={option.labelEn || ''}
                  onChange={(event) =>
                    onOptionChange((prev) => ({
                      ...prev,
                      labelEn: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor={descriptionFieldId}
                className='text-sm font-medium'
              >
                {isZh ? '说明' : 'Description'}
              </Label>
              <Textarea
                id={descriptionFieldId}
                className='min-h-24 rounded-xl border-input/60 bg-muted/20 shadow-none'
                value={option.description || ''}
                onChange={(event) =>
                  onOptionChange((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className='flex items-center justify-between gap-4 border-t pt-4'>
              <div className='space-y-1'>
                <Label
                  htmlFor={activeStatusFieldId}
                  className='text-sm font-medium'
                >
                  {isZh ? '启用状态' : 'Active status'}
                </Label>
                <p
                  id={activeStatusDescriptionId}
                  className='text-xs leading-relaxed text-muted-foreground'
                >
                  {isBOMGradeOption
                    ? isZh
                      ? '启用后可在 BOM 的性能版本中选择；停用后保留已有记录，后续不再提供选择。'
                      : 'Active options can be selected in BOMs. Disabling an option preserves existing records and prevents new selections.'
                    : isZh
                      ? '启用后可在产品模板对应的属性字段中选择，停用后隐藏。'
                      : 'Active level 2 options are available in product template attribute fields; inactive options are hidden.'}
                </p>
              </div>
              <Switch
                id={activeStatusFieldId}
                aria-describedby={activeStatusDescriptionId}
                checked={Boolean(option.active)}
                onCheckedChange={(checked) =>
                  onOptionChange((prev) => ({ ...prev, active: checked }))
                }
              />
            </div>
          </fieldset>
        </form>

        <DialogFooter
          className={productTemplateAttributeOptionDialogClasses.footer}
        >
          <Button
            variant='outline'
            type='button'
            className='h-10 rounded-full px-5 text-xs font-bold'
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            {isZh ? '取消' : 'Cancel'}
          </Button>
          <Button
            type='submit'
            form={optionFormId}
            disabled={isSaving || !isCatalogReady}
            className='h-10 rounded-full px-5 text-xs font-bold'
          >
            {isSaving ? (isZh ? '保存中…' : 'Saving…') : isZh ? '保存' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
