import { useId } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { type SaveProductTemplateAttributeLevelOneCategoryInput } from '../../mutation-types'

interface ProductTemplateAttributeLevelOneCategoryDialogProps {
  locale: string
  open: boolean
  category: SaveProductTemplateAttributeLevelOneCategoryInput
  isSaving?: boolean
  onOpenChange: (open: boolean) => void
  onCategoryChange: (
    updater: (
      prev: SaveProductTemplateAttributeLevelOneCategoryInput
    ) => SaveProductTemplateAttributeLevelOneCategoryInput
  ) => void
  onSave: () => void
}

export function ProductTemplateAttributeLevelOneCategoryDialog({
  locale,
  open,
  category,
  isSaving = false,
  onOpenChange,
  onCategoryChange,
  onSave,
}: ProductTemplateAttributeLevelOneCategoryDialogProps) {
  const isZh = locale === 'zh-CN'
  const categoryFormId = useId()
  const chineseNameFieldId = `${categoryFormId}-chinese-name`
  const englishNameFieldId = `${categoryFormId}-english-name`
  const descriptionFieldId = `${categoryFormId}-description`
  const activeStatusFieldId = `${categoryFormId}-active`
  const activeStatusDescriptionId = `${categoryFormId}-active-description`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='2xl'
        className='flex flex-col gap-0 overflow-hidden rounded-3xl border bg-background p-0 shadow-2xl'
      >
        <DialogHeader className='shrink-0 px-6 pt-6 pb-2 text-start'>
          <DialogTitle className='text-xl font-semibold text-foreground'>
            {category.id
              ? isZh
                ? '编辑一级属性分类'
                : 'Edit Level 1 Attribute Category'
              : isZh
                ? '新增一级属性分类'
                : 'Create Level 1 Attribute Category'}
          </DialogTitle>
          <DialogDescription className='text-sm leading-relaxed text-muted-foreground'>
            {isZh
              ? '定义产品模板的属性维度，例如“材质”“颜色”；具体可选项在二级属性分类中维护。'
              : 'Define a product template attribute dimension, such as Material or Color. Manage its selectable options as level 2 attribute categories.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id={categoryFormId}
          className='min-h-0 flex-1 overflow-y-auto px-6 py-5'
          onSubmit={(event) => {
            event.preventDefault()
            if (!isSaving) onSave()
          }}
        >
          <fieldset disabled={isSaving} className='min-w-0 space-y-5'>
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label
                  htmlFor={chineseNameFieldId}
                  className='text-sm font-medium'
                >
                  {isZh ? '中文名称' : 'Chinese name'}
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
                  value={category.nameZh || ''}
                  onChange={(event) =>
                    onCategoryChange((prev) => ({
                      ...prev,
                      nameZh: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label
                  htmlFor={englishNameFieldId}
                  className='text-sm font-medium'
                >
                  {isZh ? '英文名称' : 'English name'}
                </Label>
                <Input
                  id={englishNameFieldId}
                  maxLength={255}
                  className='h-11 rounded-xl border-input/60 bg-muted/20 shadow-none'
                  value={category.nameEn || ''}
                  onChange={(event) =>
                    onCategoryChange((prev) => ({
                      ...prev,
                      nameEn: event.target.value,
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
                value={category.description || ''}
                onChange={(event) =>
                  onCategoryChange((prev) => ({
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
                  {isZh
                    ? '停用后保留该属性维度及已有二级属性选项，供后续维护。'
                    : 'Inactive level 1 attribute categories and their level 2 options are retained for maintenance.'}
                </p>
              </div>
              <Switch
                id={activeStatusFieldId}
                aria-describedby={activeStatusDescriptionId}
                checked={Boolean(category.active)}
                onCheckedChange={(checked) =>
                  onCategoryChange((prev) => ({ ...prev, active: checked }))
                }
              />
            </div>
          </fieldset>
        </form>

        <DialogFooter className='shrink-0 flex-row justify-end border-t bg-muted/20 px-6 py-4'>
          <Button
            variant='outline'
            type='button'
            disabled={isSaving}
            className='h-10 rounded-xl px-5 text-sm font-medium'
            onClick={() => onOpenChange(false)}
          >
            {isZh ? '取消' : 'Cancel'}
          </Button>
          <Button
            type='submit'
            form={categoryFormId}
            disabled={isSaving}
            className='h-10 rounded-xl px-5 text-sm font-medium'
          >
            {isSaving ? (isZh ? '保存中…' : 'Saving…') : isZh ? '保存' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
