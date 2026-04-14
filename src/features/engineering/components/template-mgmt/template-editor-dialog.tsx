'use client'

import { Eye } from 'lucide-react'
import { type TranslationKey } from '@/locales'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type ProductAttributeCategory, type ProductTemplate } from '../../data/schema'
import { SPEC_COMPONENTS } from '../specs'
import { getCategoryName } from '../../utils/product-attribute-utils'
import {
  normalizeEngineeringTemplateCode,
  normalizeEngineeringTemplateComponentKey,
} from '../../utils/product-code-normalization'
import { TemplateEditorDialogLayout } from './template-editor-dialog-layout'

interface AssembledCategoryItem {
  binding: NonNullable<ProductTemplate['attributeBindings']>[number]
  category?: ProductAttributeCategory
}

type AvailableCategoryItem = ProductAttributeCategory

interface TemplateEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTemplate: ProductTemplate | null
  selectedCategoryKey: string
  onSelectedCategoryKeyChange: (value: string) => void
  onTemplateChange: (updater: (prev: ProductTemplate | null) => ProductTemplate | null) => void
  onAddAttributeBinding: () => void
  onRemoveAttributeBinding: (categoryKey: string) => void
  onToggleRequired: (categoryKey: string, checked: boolean) => void
  onSubmit: () => void
  locale: string
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  componentLabels: Record<string, string>
  assembledCategories: AssembledCategoryItem[]
  availableCategories: AvailableCategoryItem[]
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
  locale,
  t,
  componentLabels,
  assembledCategories,
  availableCategories,
}: TemplateEditorDialogProps) {
  const templateName = editingTemplate?.name?.trim() || t('engineering.templateMgmt.assembly.previewEmpty')
  const templateCode = editingTemplate?.code?.trim() || '—'
  const templateDescription = editingTemplate?.description?.trim() || t('engineering.templateMgmt.card.descriptionFallback')
  const componentLabel = componentLabels[editingTemplate?.componentKey || 'GENERAL']
    || t('engineering.templateMgmt.components.GENERAL')
  const controlClassName = 'h-12! min-h-12 rounded-2xl border-none bg-muted/40 px-4 py-0 text-[12px] leading-none font-black italic'
  const controlMonoClassName = 'h-12! min-h-12 rounded-2xl border-none bg-muted/40 px-4 py-0 text-[12px] leading-none font-mono font-black italic'
  const selectControlClassName = 'h-12! min-h-12 rounded-2xl border-none bg-muted/40 px-4 py-0 text-[12px] leading-none font-black italic'

  const leftColumn = (
    <div className='space-y-5'>
      <div className='rounded-[24px] border border-dashed border-blue-200/60 bg-background/80 p-4'>
        <div className='text-[13px] font-black italic tracking-tight text-blue-700'>
          {t('engineering.templateMgmt.fields.name')}
        </div>
        <div className='mt-1 text-[9px] font-black uppercase tracking-[0.18em] opacity-60 text-blue-600/50'>
          {t('engineering.templateMgmt.dialog.description')}
        </div>
        <div className='mt-3 flex flex-wrap gap-2'>
          <div className='rounded-full bg-muted/40 px-3 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-slate-700'>
            {templateCode}
          </div>
          <div className='rounded-full bg-blue-50 px-3 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-blue-700'>
            {componentLabel}
          </div>
        </div>
      </div>

      <div className='space-y-4 rounded-[24px] border border-dashed border-muted/40 bg-background/80 p-4'>
        <div>
          <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {t('engineering.templateMgmt.fields.name')}
          </div>
          <div className='mt-1 text-[13px] font-black italic tracking-tight text-slate-700'>
            {templateName}
          </div>
        </div>

        <div className='grid gap-4'>
          <div className='space-y-2'>
            <Input
              placeholder={t('engineering.templateMgmt.placeholders.name')}
              className={controlClassName}
              value={editingTemplate?.name || ''}
              onChange={(event) =>
                onTemplateChange((prev) =>
                  prev ? { ...prev, name: event.target.value } : null
                )
              }
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('engineering.templateMgmt.fields.code')}
            </Label>
            <Input
              placeholder={t('engineering.templateMgmt.placeholders.code')}
              className={controlMonoClassName}
              value={editingTemplate?.code || ''}
              onChange={(event) =>
                onTemplateChange((prev) =>
                  prev ? { ...prev, code: normalizeEngineeringTemplateCode(event.target.value) } : null
                )
              }
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('engineering.templateMgmt.fields.component')}
            </Label>
            <Select
              value={editingTemplate?.componentKey || 'GENERAL'}
              onValueChange={(value) =>
                onTemplateChange((prev) =>
                  prev
                    ? {
                        ...prev,
                        componentKey: normalizeEngineeringTemplateComponentKey(value),
                      }
                    : null
                )
              }
            >
              <SelectTrigger className={selectControlClassName}>
                <SelectValue placeholder={t('engineering.templateMgmt.placeholders.component')} />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-none shadow-2xl'>
                {Object.keys(SPEC_COMPONENTS).map((key) => (
                  <SelectItem key={key} value={key} className='text-xs font-black italic'>
                    {componentLabels[key] || t('engineering.templateMgmt.components.GENERAL')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-[9px] font-black uppercase tracking-widest opacity-60 text-blue-600/40'>
              {t('engineering.templateMgmt.hints.component')}
            </p>
          </div>

          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {t('engineering.templateMgmt.fields.description')}
          </Label>
          <Input
            placeholder={t('engineering.templateMgmt.placeholders.description')}
            className={controlClassName}
            value={editingTemplate?.description || ''}
            onChange={(event) =>
              onTemplateChange((prev) =>
                prev ? { ...prev, description: event.target.value } : null
              )
            }
          />
          <div className='wrap-break-word rounded-2xl bg-muted/20 px-3 py-3 text-[11px] font-bold leading-relaxed text-muted-foreground'>
            {templateDescription}
          </div>
        </div>
      </div>
    </div>
  )

  const middleColumn = (
    <div className='space-y-4'>
      <div className='rounded-[24px] border border-dashed border-blue-200/60 bg-background/80 p-4'>
        <div className='text-[13px] font-black italic tracking-tight text-blue-700'>
          {t('engineering.templateMgmt.fields.assemblyTitle')}
        </div>
        <div className='mt-1 text-[9px] font-black uppercase tracking-[0.18em] opacity-60 text-blue-600/50'>
          {t('engineering.templateMgmt.hints.assembly')}
        </div>
      </div>

      <div className='rounded-[24px] border border-dashed border-muted/40 bg-background/80 p-4'>
        <div className='flex items-center justify-between gap-3 border-b border-dashed border-muted/30 pb-3'>
          <div>
            <div className='text-[13px] font-black italic tracking-tight text-slate-700'>
              {t('engineering.templateMgmt.buttons.addAttribute')}
            </div>
            <div className='mt-1 text-[9px] font-black uppercase tracking-[0.18em] opacity-60 text-muted-foreground/60'>
              {t('engineering.templateMgmt.placeholders.attributeCategory')}
            </div>
          </div>
          <div className='rounded-full bg-blue-600/10 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-blue-700'>
            {assembledCategories.length}
          </div>
        </div>

        <div className='mt-4 flex flex-col gap-2 lg:flex-row'>
          <Select value={selectedCategoryKey} onValueChange={onSelectedCategoryKeyChange}>
            <SelectTrigger className={`${selectControlClassName} lg:flex-1`}>
              <SelectValue placeholder={t('engineering.templateMgmt.placeholders.attributeCategory')} />
            </SelectTrigger>
            <SelectContent className='rounded-2xl border-none shadow-2xl'>
              {availableCategories.length === 0 ? (
                <div className='px-3 py-2 text-xs font-bold text-muted-foreground'>
                  {t('engineering.templateMgmt.assembly.noAvailableCategories')}
                </div>
              ) : (
                availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.key} className='text-xs font-black italic'>
                    {getCategoryName(locale, category)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            type='button'
            onClick={onAddAttributeBinding}
            disabled={!selectedCategoryKey}
            className='h-12! min-h-12 rounded-2xl border border-dashed border-input bg-muted/40 px-4 py-0 text-[11px] leading-none font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-muted/60 hover:text-slate-900 lg:shrink-0'
          >
            {t('engineering.templateMgmt.buttons.addAttribute')}
          </Button>
        </div>
      </div>

      <div className='rounded-[24px] border border-dashed border-muted/40 bg-background/80 p-4'>
        <div className='flex items-center justify-between gap-3 border-b border-dashed border-muted/30 pb-3'>
          <div>
            <div className='text-[13px] font-black italic tracking-tight text-slate-700'>
              {t('engineering.templateMgmt.assembly.previewAttributes')}
            </div>
            <div className='mt-1 text-[9px] font-black uppercase tracking-[0.18em] opacity-60 text-muted-foreground/60'>
              {t('engineering.templateMgmt.assembly.previewSpec')}
            </div>
          </div>
          <div className='rounded-full bg-slate-900/5 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-slate-600'>
            {componentLabel}
          </div>
        </div>

        <div className='mt-4 grid gap-3 xl:grid-cols-2'>
          {assembledCategories.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-muted/40 bg-muted/20 px-4 py-5 text-[11px] font-bold leading-relaxed text-muted-foreground xl:col-span-2'>
              {t('engineering.templateMgmt.assembly.empty')}
            </div>
          ) : (
            assembledCategories.map(({ binding, category }) => (
              <div
                key={binding.categoryKey}
                className='flex flex-col gap-3 rounded-2xl border border-dashed border-muted/40 bg-muted/20 px-4 py-3'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0 space-y-1'>
                    <div className='text-[11px] font-black italic text-slate-700'>
                      {getCategoryName(locale, category)}
                    </div>
                    <div className='break-all text-[8px] font-mono font-black uppercase tracking-widest text-muted-foreground/40'>
                      {binding.categoryKey}
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => onRemoveAttributeBinding(binding.categoryKey)}
                    className='h-8 shrink-0 rounded-full px-3 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600'
                  >
                    {t('engineering.templateMgmt.buttons.removeAttribute')}
                  </Button>
                </div>
                <div className='flex items-center justify-between gap-3'>
                  <label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600'>
                    <Checkbox
                      checked={binding.required}
                      onCheckedChange={(checked) => onToggleRequired(binding.categoryKey, checked === true)}
                    />
                    {binding.required
                      ? t('engineering.templateMgmt.assembly.required')
                      : t('engineering.templateMgmt.assembly.optional')}
                  </label>
                  <div className='shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-emerald-600'>
                    {binding.active
                      ? t('engineering.templateMgmt.assembly.active')
                      : t('engineering.templateMgmt.assembly.inactive')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const rightColumn = (
    <div className='space-y-4'>
      <div className='rounded-[24px] border border-dashed border-blue-200/70 bg-background/80 p-4'>
        <div className='flex items-center gap-2 text-blue-700'>
          <Eye className='size-4' />
          <div className='min-w-0'>
            <div className='text-[13px] font-black italic tracking-tight'>
              {t('engineering.templateMgmt.fields.previewTitle')}
            </div>
            <div className='mt-1 wrap-break-word text-[9px] font-black uppercase tracking-[0.18em] opacity-60 text-blue-700/70'>
              {templateName}
            </div>
          </div>
        </div>

        <div className='mt-4 grid gap-3'>
          <div className='rounded-2xl bg-blue-50 px-3 py-3'>
            <div className='text-[10px] font-black uppercase tracking-widest text-blue-700/60'>
              {t('engineering.templateMgmt.assembly.previewSpec')}
            </div>
            <div className='mt-1 wrap-break-word text-[12px] font-black italic text-slate-800'>
              {componentLabel}
            </div>
          </div>
          <div className='rounded-2xl bg-blue-50 px-3 py-3'>
            <div className='text-[10px] font-black uppercase tracking-widest text-blue-700/60'>
              {t('engineering.templateMgmt.fields.description')}
            </div>
            <div className='mt-1 wrap-break-word text-[11px] font-bold leading-relaxed text-muted-foreground'>
              {templateDescription}
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-[24px] border border-dashed border-blue-200/70 bg-background/80 p-4'>
        <div className='flex items-center justify-between gap-3 border-b border-dashed border-blue-200/60 pb-3'>
          <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('engineering.templateMgmt.assembly.previewAttributes')}
          </div>
          <div className='rounded-full bg-blue-600/10 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-blue-700'>
            {assembledCategories.length}
          </div>
        </div>
        <div className='mt-4 text-[9px] font-black uppercase tracking-widest opacity-60 text-blue-700/60'>
          {t('engineering.templateMgmt.assembly.previewAttributes')}
        </div>
        <div className='mt-3 space-y-2'>
          {assembledCategories.length === 0 ? (
            <div className='rounded-2xl bg-blue-50 px-3 py-4 text-[11px] font-bold leading-relaxed text-muted-foreground'>
              {t('engineering.templateMgmt.assembly.previewEmpty')}
            </div>
          ) : (
            assembledCategories.map(({ binding, category }) => (
              <div
                key={binding.categoryKey}
                className='flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2'
              >
                <div className='min-w-0'>
                  <div className='wrap-break-word text-[11px] font-black italic text-slate-700'>
                    {getCategoryName(locale, category)}
                  </div>
                  <div className='break-all text-[8px] font-mono font-black uppercase tracking-widest text-muted-foreground/40'>
                    {binding.categoryKey}
                  </div>
                </div>
                <div className='shrink-0 rounded-full bg-slate-900/5 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest text-slate-600'>
                  {binding.required
                    ? t('engineering.templateMgmt.assembly.required')
                    : t('engineering.templateMgmt.assembly.optional')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const footer = (
    <>
      <Button
        variant='ghost'
        onClick={() => onOpenChange(false)}
        className='h-11 rounded-full text-[10px] font-black uppercase'
      >
        {t('engineering.templateMgmt.buttons.cancel')}
      </Button>
      <Button
        onClick={onSubmit}
        className='h-11 rounded-full bg-blue-600 px-8 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700'
      >
        {t('engineering.templateMgmt.buttons.save')}
      </Button>
    </>
  )

  return (
    <TemplateEditorDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title={editingTemplate?.id
        ? t('engineering.templateMgmt.dialog.editTitle')
        : t('engineering.templateMgmt.dialog.createTitle')}
      description={t('engineering.templateMgmt.dialog.description')}
      leftColumn={leftColumn}
      middleColumn={middleColumn}
      rightColumn={rightColumn}
      footer={footer}
    />
  )
}
