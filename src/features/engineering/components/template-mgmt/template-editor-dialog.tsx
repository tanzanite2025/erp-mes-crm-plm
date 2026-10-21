'use client'

import { useId, type ReactNode } from 'react'
import { type TranslationKey } from '@/locales'
import { LayoutTemplate, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import {
  type ProductTemplate,
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../../data/schema'
import { areSameProductAttributeCategoryKey } from '../../utils/product-attribute-machine-value'
import {
  getProductTemplateAttributeLevelOneCategoryName,
  getProductTemplateAttributeLevelTwoOptionLabel,
} from '../../utils/product-attribute-utils'

const productTemplateEditorDialogClasses = buildActionDialogShellClasses({
  content:
    'flex max-h-[90dvh] flex-col gap-0 rounded-[24px] sm:rounded-[32px] [&_[data-slot=button]]:rounded-full',
  header: 'border-muted/50 px-5 py-5 pr-16 text-start sm:px-8 sm:py-6 sm:pr-16',
  title: 'flex items-center gap-3 text-base text-primary sm:text-lg',
  description:
    'text-[10px] leading-relaxed font-bold tracking-normal normal-case opacity-70 sm:text-[11px]',
  body: 'min-h-0 flex-1 overflow-y-auto p-5 sm:p-8',
  footer:
    'shrink-0 flex-row justify-end gap-3 border-muted/50 px-5 py-4 sm:px-8 sm:py-5',
})

interface AssembledCategoryItem {
  binding: NonNullable<ProductTemplate['attributeBindings']>[number]
  category?: ProductTemplateAttributeLevelOneCategory
}

interface TemplateEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTemplate: ProductTemplate | null
  selectedCategoryKey: string
  onSelectedCategoryKeyChange: (value: string) => void
  onTemplateChange: (
    updater: (prev: ProductTemplate | null) => ProductTemplate | null
  ) => void
  onAddAttributeBinding: () => void
  onRemoveAttributeBinding: (categoryKey: string) => void
  onToggleRequired: (categoryKey: string, checked: boolean) => void
  onSubmit: () => void
  isSaving: boolean
  locale: string
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  assembledCategories: AssembledCategoryItem[]
  availableCategories: ProductTemplateAttributeLevelOneCategory[]
  attributeOptions: ProductTemplateAttributeLevelTwoOption[]
  isAttributeCatalogReady: boolean
  attributeCatalogRequestState: ReactNode
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  editingTemplate,
  selectedCategoryKey,
  onSelectedCategoryKeyChange,
  onTemplateChange,
  onAddAttributeBinding,
  onRemoveAttributeBinding,
  onToggleRequired,
  onSubmit,
  isSaving,
  locale,
  t,
  assembledCategories,
  availableCategories,
  attributeOptions,
  isAttributeCatalogReady,
  attributeCatalogRequestState,
}: TemplateEditorDialogProps) {
  const templateFormId = useId()
  const templateNameFieldId = `${templateFormId}-name`
  const templateDescriptionFieldId = `${templateFormId}-description`
  const levelOneAttributeCategoryFieldId = `${templateFormId}-level-one-category`
  const selectedCategory = availableCategories.find((category) =>
    areSameProductAttributeCategoryKey(category.key, selectedCategoryKey)
  )

  function renderLevelTwoAttributeOptions(categoryKey: string) {
    if (!isAttributeCatalogReady) return null
    const activeOptions = attributeOptions
      .filter(
        (option) =>
          option.active &&
          areSameProductAttributeCategoryKey(option.categoryKey, categoryKey)
      )
      .sort((left, right) => left.sortOrder - right.sortOrder)

    return (
      <div className='space-y-2'>
        <p className='text-[10px] font-bold text-muted-foreground'>
          {t('engineering.templateMgmt.assembly.levelTwoOptionCount', {
            count: activeOptions.length,
          })}
        </p>
        {activeOptions.length > 0 ? (
          <ul
            className='flex max-h-36 flex-wrap gap-1.5 overflow-y-auto'
            aria-label={t('engineering.templateMgmt.assembly.levelTwoOptions')}
          >
            {activeOptions.map((option) => (
              <li
                key={option.id}
                className='rounded-full border border-dashed border-primary/15 bg-background px-3 py-1 text-[11px] font-bold text-foreground/80'
              >
                {getProductTemplateAttributeLevelTwoOptionLabel(locale, option)}
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-xs leading-relaxed text-muted-foreground'>
            {t('engineering.templateMgmt.assembly.noActiveLevelTwoOptions')}
          </p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='6xl'
        className={productTemplateEditorDialogClasses.content}
        closeButtonClassName='top-5 end-5 flex size-8 items-center justify-center rounded-full bg-muted/60 opacity-80 transition-colors hover:bg-muted hover:opacity-100 sm:top-6 sm:end-6'
      >
        <DialogHeader className={productTemplateEditorDialogClasses.header}>
          <DialogTitle className={productTemplateEditorDialogClasses.title}>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400'>
              <LayoutTemplate className='size-4' />
            </span>
            {editingTemplate?.id
              ? t('engineering.templateMgmt.dialog.editTitle')
              : t('engineering.templateMgmt.dialog.createTitle')}
          </DialogTitle>
          <DialogDescription
            className={productTemplateEditorDialogClasses.description}
          >
            {t('engineering.templateMgmt.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form
          id={templateFormId}
          className={productTemplateEditorDialogClasses.body}
          onSubmit={(event) => {
            event.preventDefault()
            if (!isSaving) onSubmit()
          }}
        >
          <fieldset
            disabled={isSaving}
            className='grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.5fr)]'
          >
            <section
              className='min-w-0 space-y-5 rounded-[24px] border border-dashed border-muted/60 bg-muted/5 p-4 sm:p-5'
              aria-label={t('engineering.templateMgmt.fields.basicInformation')}
            >
              <h3 className='text-[11px] font-black tracking-wide text-primary uppercase'>
                {t('engineering.templateMgmt.fields.basicInformation')}
              </h3>
              <div className='space-y-2'>
                <Label
                  htmlFor={templateNameFieldId}
                  className='ml-1 text-[10px] font-black tracking-wide text-muted-foreground uppercase'
                >
                  {t('engineering.templateMgmt.fields.name')}
                </Label>
                <Input
                  id={templateNameFieldId}
                  className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-none md:text-xs'
                  autoFocus
                  required
                  maxLength={255}
                  value={editingTemplate?.name || ''}
                  placeholder={t('engineering.templateMgmt.placeholders.name')}
                  onChange={(event) =>
                    onTemplateChange((previousTemplate) =>
                      previousTemplate
                        ? { ...previousTemplate, name: event.target.value }
                        : null
                    )
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label
                  htmlFor={templateDescriptionFieldId}
                  className='ml-1 text-[10px] font-black tracking-wide text-muted-foreground uppercase'
                >
                  {t('engineering.templateMgmt.fields.description')}
                </Label>
                <Textarea
                  id={templateDescriptionFieldId}
                  className='min-h-32 rounded-2xl border-none bg-muted/50 px-4 py-3 text-xs leading-relaxed shadow-none md:text-xs'
                  value={editingTemplate?.description || ''}
                  placeholder={t(
                    'engineering.templateMgmt.placeholders.description'
                  )}
                  onChange={(event) =>
                    onTemplateChange((previousTemplate) =>
                      previousTemplate
                        ? {
                            ...previousTemplate,
                            description: event.target.value,
                          }
                        : null
                    )
                  }
                />
              </div>
            </section>

            <section
              className='min-w-0 space-y-5 rounded-[24px] border border-dashed border-muted/60 bg-muted/5 p-4 sm:p-5'
              aria-label={t('engineering.templateMgmt.fields.assemblyTitle')}
            >
              <div className='space-y-2'>
                <h3 className='text-[11px] font-black tracking-wide text-primary uppercase'>
                  {t('engineering.templateMgmt.fields.assemblyTitle')}
                </h3>
                <p className='text-[11px] leading-relaxed text-muted-foreground'>
                  {t('engineering.templateMgmt.hints.assembly')}
                </p>
              </div>
              {attributeCatalogRequestState}
              <div className='space-y-3'>
                <Label
                  htmlFor={levelOneAttributeCategoryFieldId}
                  className='ml-1 text-[10px] font-black tracking-wide text-muted-foreground uppercase'
                >
                  {t(
                    'engineering.templateMgmt.fields.levelOneAttributeCategory'
                  )}
                </Label>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                  <Select
                    value={selectedCategory?.key || ''}
                    onValueChange={onSelectedCategoryKeyChange}
                    disabled={!isAttributeCatalogReady}
                  >
                    <SelectTrigger
                      id={levelOneAttributeCategoryFieldId}
                      className='h-11 w-full min-w-0 flex-1 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-bold shadow-none'
                    >
                      <SelectValue
                        placeholder={t(
                          'engineering.templateMgmt.placeholders.attributeCategory'
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.length === 0 ? (
                        <p className='px-3 py-2 text-xs text-muted-foreground'>
                          {t(
                            'engineering.templateMgmt.assembly.noAvailableCategories'
                          )}
                        </p>
                      ) : (
                        availableCategories.map((category) => (
                          <SelectItem key={category.id} value={category.key}>
                            {getProductTemplateAttributeLevelOneCategoryName(
                              locale,
                              category
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-10 rounded-full border-dashed border-blue-200 bg-blue-600/5 px-5 text-[10px] font-black tracking-wide text-blue-600 shadow-none transition-all hover:bg-blue-600/10 hover:text-blue-700 active:scale-95 dark:border-blue-800 dark:text-blue-400'
                    disabled={!selectedCategory || !isAttributeCatalogReady}
                    onClick={onAddAttributeBinding}
                  >
                    <Plus className='size-3.5' />
                    {t('engineering.templateMgmt.buttons.addAttribute')}
                  </Button>
                </div>
                {selectedCategory && isAttributeCatalogReady && (
                  <div
                    className='space-y-3 rounded-[20px] border border-dashed border-blue-200 bg-blue-600/5 p-4 dark:border-blue-800'
                    aria-label={t(
                      'engineering.templateMgmt.assembly.selectedCategoryPreview'
                    )}
                  >
                    <p className='text-xs font-black text-primary'>
                      {getProductTemplateAttributeLevelOneCategoryName(
                        locale,
                        selectedCategory
                      )}
                    </p>
                    {renderLevelTwoAttributeOptions(selectedCategory.key)}
                  </div>
                )}
              </div>

              <div className='space-y-3'>
                <h4 className='text-[10px] font-black tracking-wide text-muted-foreground uppercase'>
                  {t(
                    'engineering.templateMgmt.assembly.levelOneCategoryCount',
                    { count: assembledCategories.length }
                  )}
                </h4>
                {assembledCategories.length === 0 ? (
                  <p className='rounded-[20px] border border-dashed border-muted/60 bg-background/50 p-5 text-xs leading-relaxed text-muted-foreground'>
                    {t('engineering.templateMgmt.assembly.empty')}
                  </p>
                ) : (
                  assembledCategories.map(({ binding, category }) => (
                    <article
                      key={binding.categoryKey}
                      className='space-y-3 rounded-[20px] border border-dashed border-muted/60 bg-background p-4 transition-colors hover:border-primary/20'
                      aria-label={
                        category
                          ? getProductTemplateAttributeLevelOneCategoryName(
                              locale,
                              category
                            )
                          : t(
                              'engineering.templateMgmt.assembly.unavailableCategory'
                            )
                      }
                    >
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='flex min-w-0 flex-wrap items-center gap-2'>
                          <h5 className='text-xs font-black text-primary'>
                            {category
                              ? getProductTemplateAttributeLevelOneCategoryName(
                                  locale,
                                  category
                                )
                              : t(
                                  'engineering.templateMgmt.assembly.unavailableCategory'
                                )}
                          </h5>
                          {(category?.active === false || !binding.active) && (
                            <span className='rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground'>
                              {t('engineering.templateMgmt.assembly.inactive')}
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-2'>
                          <label className='flex cursor-pointer items-center gap-2 rounded-full bg-muted/30 px-3 py-1.5 text-[10px] font-bold'>
                            <Checkbox
                              checked={binding.required}
                              onCheckedChange={(checked) =>
                                onToggleRequired(
                                  binding.categoryKey,
                                  checked === true
                                )
                              }
                            />
                            {t('engineering.templateMgmt.assembly.required')}
                          </label>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-7 rounded-full px-3 text-[10px] font-black text-destructive hover:bg-destructive/10 hover:text-destructive'
                            aria-label={`${t('engineering.templateMgmt.buttons.removeAttribute')} ${getProductTemplateAttributeLevelOneCategoryName(locale, category)}`}
                            onClick={() =>
                              onRemoveAttributeBinding(binding.categoryKey)
                            }
                          >
                            <Trash2 className='size-3' />
                            {t(
                              'engineering.templateMgmt.buttons.removeAttribute'
                            )}
                          </Button>
                        </div>
                      </div>
                      {renderLevelTwoAttributeOptions(binding.categoryKey)}
                    </article>
                  ))
                )}
              </div>
            </section>
          </fieldset>
        </form>

        <DialogFooter className={productTemplateEditorDialogClasses.footer}>
          <Button
            type='button'
            variant='outline'
            className='h-11 rounded-full border-dashed bg-transparent px-6 text-[11px] font-black tracking-wide shadow-none transition-all active:scale-95'
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            {t('engineering.templateMgmt.buttons.cancel')}
          </Button>
          <Button
            type='submit'
            form={templateFormId}
            disabled={isSaving}
            className='h-11 rounded-full bg-blue-600 px-8 text-[11px] font-black tracking-wide text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95'
          >
            <Save className='size-3.5' />
            {isSaving
              ? t('engineering.templateMgmt.buttons.saving')
              : t('engineering.templateMgmt.buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
