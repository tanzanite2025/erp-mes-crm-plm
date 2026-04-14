'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { SelectDropdown } from '@/components/select-dropdown'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createLogger } from '@/lib/logger'
import { localizeTemplateDefinitions } from '../data/template-defaults'
import { productTypeSchema, type ProductTemplate, type ProductType, type ProductTypeAttributeBinding } from '../data/schema'
import { ProductTypeService } from '../services/product-type-service'
import { ProductTypeAttributeBindingService } from '../services/product-type-attribute-binding-service'
import { productTemplateService } from '../services/product-template-service'
import { type SaveProductTypeInput } from '../mutation-types'
import {
  normalizeEngineeringProductTypeCode,
  normalizeProductTypeEntity,
} from '../utils/product-code-normalization'

const logger = createLogger('ProductTypeActionDialog')

type ProductTypeForm = Omit<ProductType, 'parentId' | 'templateId'> & {
  parentId: string
  templateId: string
}

type ProductTypeActionDialogProps = {
  currentRow?: ProductType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (
    data: SaveProductTypeInput,
    options?: { syncTemplateBindings?: boolean; template?: ProductTemplate | null }
  ) => void | Promise<void>
}

const CODE_RULES = [
  { aliases: ['公路', 'road'], code: 'ROAD' },
  { aliases: ['山地', 'mtb'], code: 'MTB' },
  { aliases: ['碎石', '砾石', 'gravel'], code: 'GRAVEL' },
  { aliases: ['真空', 'tubeless'], code: 'TL' },
  { aliases: ['开口', 'clincher'], code: 'CL' },
  { aliases: ['管胎', 'tubular'], code: 'TU' },
  { aliases: ['碳纤维', 'carbon'], code: 'CARBON' },
  { aliases: ['铝合金', 'alu', 'aluminum'], code: 'ALU' },
] as const

export function ProductTypeActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSubmit,
}: ProductTypeActionDialogProps) {
  const { t } = useLanguage()
  const isEdit = Boolean(currentRow)
  const [allTypes, setAllTypes] = useState<ProductType[]>([])
  const [allTemplates, setAllTemplates] = useState<ProductTemplate[]>([])
  const [currentBindings, setCurrentBindings] = useState<ProductTypeAttributeBinding[]>([])
  const [inheritTemplateBindings, setInheritTemplateBindings] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProductTypeForm>({
    resolver: zodResolver(productTypeSchema) as never,
    defaultValues: {
      id: '',
      parentId: '',
      name: '',
      code: '',
      templateId: 'none',
      description: '',
      active: true,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      version: 1,
    },
  })

  const categoryName = form.watch('name')
  const currentCode = form.watch('code')
  const watchedTemplateId = form.watch('templateId')

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [storedTypes, storedTemplates, storedBindings] = await Promise.all([
          ProductTypeService.getProductTypes(),
          productTemplateService.getTemplates(),
          currentRow?.id
            ? ProductTypeAttributeBindingService.getProductTypeAttributeBindings({ productTypeId: currentRow.id })
            : Promise.resolve([]),
        ])

        setAllTypes(storedTypes || [])
        setAllTemplates(storedTemplates || [])
        setCurrentBindings(storedBindings || [])
      } catch (error) {
        logger.error('Failed to load category dialog data', error)
      }

      if (isEdit && currentRow) {
        form.reset({
          ...normalizeProductTypeEntity(currentRow),
          parentId: currentRow.parentId || 'root',
          templateId: currentRow.templateId || 'none',
        })
        setInheritTemplateBindings(false)
        return
      }

      form.reset({
        id: '',
        parentId: 'root',
        name: '',
        code: '',
        templateId: 'none',
        description: '',
        active: true,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        version: 1,
      })
      setCurrentBindings([])
      setInheritTemplateBindings(true)
    }

    if (open) void loadInitialData()
  }, [currentRow, form, isEdit, open])

  useEffect(() => {
    if (isEdit || !categoryName) return

    const normalizedName = categoryName.toLowerCase()
    const canAutofill =
      !currentCode ||
      ['ROAD', 'MTB', 'GRAVEL'].includes(currentCode) ||
      currentCode.includes('-')

    if (!canAutofill) return

    const tokens = CODE_RULES.flatMap((rule) =>
      rule.aliases.some((alias) => normalizedName.includes(alias)) ? [rule.code] : []
    )

    if (tokens.length > 0) {
      form.setValue('code', normalizeEngineeringProductTypeCode(Array.from(new Set(tokens)).join('-')), {
        shouldValidate: true,
      })
    }
  }, [categoryName, currentCode, form, isEdit])

  const excludedIds = useMemo(() => {
    if (!isEdit || !currentRow) return new Set<string>()

    const collected = new Set<string>([currentRow.id])

    const findChildrenRecursive = (parentId: string) => {
      allTypes.forEach((type) => {
        if (type.parentId !== parentId) return
        collected.add(type.id)
        findChildrenRecursive(type.id)
      })
    }

    findChildrenRecursive(currentRow.id)
    return collected
  }, [allTypes, currentRow, isEdit])

  const selectableParents = useMemo(
    () => allTypes.filter((type) => !excludedIds.has(type.id)),
    [allTypes, excludedIds]
  )

  const localizedTemplates = useMemo(
    () => localizeTemplateDefinitions(allTemplates, t),
    [allTemplates, t]
  )

  const selectedTemplate = useMemo(() => {
    if (!watchedTemplateId || watchedTemplateId === 'none') return null
    return allTemplates.find((template) => template.id === watchedTemplateId) || null
  }, [allTemplates, watchedTemplateId])

  const templateAssembly = useMemo(
    () => [...(selectedTemplate?.attributeBindings ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [selectedTemplate]
  )

  const templateBindingStatus = useMemo(() => {
    if (!selectedTemplate) return 'none'
    if (currentBindings.length === 0) return 'unknown'

    const templateSignature = templateAssembly
      .map((item) => `${item.categoryKey}:${item.required ? '1' : '0'}:${item.active === false ? '0' : '1'}`)
      .sort()
      .join('|')
    const currentSignature = currentBindings
      .map((item) => `${item.categoryKey}:${item.required ? '1' : '0'}:${item.active === false ? '0' : '1'}`)
      .sort()
      .join('|')

    return templateSignature === currentSignature ? 'aligned' : 'drifted'
  }, [currentBindings, selectedTemplate, templateAssembly])

  const handleFormSubmit = async (values: ProductTypeForm) => {
    setIsSubmitting(true)

    try {
      const submissionData: SaveProductTypeInput = {
        ...normalizeProductTypeEntity(values),
        id: values.id || currentRow?.id,
        createdAt: values.createdAt || currentRow?.createdAt || new Date().toISOString(),
        parentId: values.parentId === 'root' ? undefined : values.parentId || undefined,
        templateId: values.templateId === 'none' ? undefined : values.templateId || undefined,
      }

      if (onSubmit) {
        await onSubmit(submissionData, {
          syncTemplateBindings: inheritTemplateBindings && Boolean(selectedTemplate),
          template: selectedTemplate,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] sm:max-w-md p-0 overflow-hidden rounded-[24px] sm:rounded-[32px] border-none shadow-2xl'>
        <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
        <DialogHeader className='p-4 sm:p-8 pb-2 relative'>
          <DialogTitle className='text-base sm:text-lg font-black tracking-tighter italic uppercase text-primary'>
            {isEdit
              ? t('engineering.categoryArchive.dialog.editTitle')
              : t('engineering.categoryArchive.dialog.createTitle')}
          </DialogTitle>
          <DialogDescription className='text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 opacity-60'>
            {isEdit
              ? t('engineering.categoryArchive.dialog.editDescription')
              : t('engineering.categoryArchive.dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='product-type-form'
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className='space-y-4 sm:space-y-6 px-4 sm:px-8 max-h-[60vh] overflow-y-auto custom-scrollbar'
          >
            <input type='hidden' {...form.register('id')} />
            <input type='hidden' {...form.register('createdAt')} />
            <input type='hidden' {...form.register('version')} />

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2'>
              <FormField
                control={form.control}
                name='parentId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1'>
                      {t('engineering.categoryArchive.dialog.parent')}
                    </FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      items={[
                        {
                          label: t('engineering.categoryArchive.dialog.parentNone'),
                          value: 'root',
                        },
                        ...selectableParents.map((type) => ({
                          label: `${type.name} (${type.code})`,
                          value: type.id,
                        })),
                      ]}
                      placeholder={t('engineering.categoryArchive.dialog.parentPlaceholder')}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1'>
                      {t('engineering.categoryArchive.dialog.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('engineering.categoryArchive.dialog.namePlaceholder')}
                        className='h-12 rounded-2xl bg-muted/50 border-none'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1'>
                      {t('engineering.categoryArchive.dialog.code')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('engineering.categoryArchive.dialog.codePlaceholder')}
                        className='h-12 rounded-2xl bg-muted/50 border-none font-mono font-bold'
                        {...field}
                        value={field.value || ''}
                        onChange={(event) => field.onChange(normalizeEngineeringProductTypeCode(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1'>
                      {t('engineering.categoryArchive.dialog.description')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('engineering.categoryArchive.dialog.descriptionPlaceholder')}
                        className='resize-none rounded-2xl bg-muted/50 border-none min-h-[80px]'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='templateId'
                render={({ field }) => (
                  <FormItem className='mb-4'>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1'>
                      {t('engineering.categoryArchive.dialog.template')}
                    </FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      items={[
                        {
                          label: t('engineering.categoryArchive.dialog.templateNone'),
                          value: 'none',
                        },
                        ...localizedTemplates.map((template) => ({
                          label: template.name,
                          value: template.id,
                        })),
                      ]}
                      placeholder={t('engineering.categoryArchive.dialog.templatePlaceholder')}
                    />
                    <div className='text-[10px] text-muted-foreground mt-1'>
                      {t('engineering.categoryArchive.dialog.templateHelp')}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='sm:col-span-2 rounded-2xl border border-dashed border-blue-200/50 bg-blue-50/40 p-4 space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-[10px] font-black uppercase tracking-widest text-blue-700'>
                      {t('engineering.categoryArchive.dialog.templateAssemblyTitle')}
                    </div>
                    <div className='text-[10px] text-muted-foreground mt-1'>
                      {selectedTemplate
                        ? t('engineering.categoryArchive.dialog.templateAssemblyCount', { count: templateAssembly.length })
                        : t('engineering.categoryArchive.dialog.templateAssemblyEmpty')}
                    </div>
                  </div>
                  {selectedTemplate ? (
                    <Badge variant='outline' className='border-blue-200 bg-white text-blue-700'>
                      {selectedTemplate.name}
                    </Badge>
                  ) : null}
                </div>

                {selectedTemplate ? (
                  <>
                    <div className='flex flex-wrap gap-2'>
                      {templateAssembly.length === 0 ? (
                        <div className='text-[11px] font-bold text-muted-foreground'>
                          {t('engineering.categoryArchive.dialog.templateAssemblyEmpty')}
                        </div>
                      ) : (
                        templateAssembly.map((binding) => (
                          <div
                            key={binding.categoryKey}
                            className='rounded-full bg-white px-3 py-1 text-[10px] font-black tracking-wide text-slate-700 border border-dashed border-blue-200'
                          >
                            {binding.categoryKey}
                            {' · '}
                            {binding.required
                              ? t('engineering.categoryArchive.dialog.templateAssemblyRequired')
                              : t('engineering.categoryArchive.dialog.templateAssemblyOptional')}
                          </div>
                        ))
                      )}
                    </div>

                    <div className='rounded-2xl bg-white/80 px-4 py-3 text-[11px] font-bold text-slate-600 border border-dashed border-blue-100'>
                      {templateBindingStatus === 'aligned'
                        ? t('engineering.categoryArchive.dialog.templateDriftAligned')
                        : templateBindingStatus === 'drifted'
                          ? t('engineering.categoryArchive.dialog.templateDriftDetected')
                          : t('engineering.categoryArchive.dialog.templateDriftUnknown')}
                    </div>

                    <div className='flex flex-row items-center justify-between rounded-2xl bg-white/90 p-3 border border-dashed border-blue-100 gap-4'>
                      <div className='space-y-0.5 min-w-0 flex-1 text-left'>
                        <div className='text-[10px] font-black uppercase tracking-widest text-blue-700'>
                          {t('engineering.categoryArchive.dialog.templateSyncToggle')}
                        </div>
                        <div className='text-[9px] font-black text-muted-foreground/70 leading-tight mt-1'>
                          {t('engineering.categoryArchive.dialog.templateSyncHelp')}
                        </div>
                      </div>
                      <Switch checked={inheritTemplateBindings} onCheckedChange={setInheritTemplateBindings} />
                    </div>
                  </>
                ) : null}
              </div>
              <FormField
                control={form.control}
                name='active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-2xl bg-muted/30 p-3 sm:p-4 shadow-sm border border-dashed border-primary/5 gap-4'>
                    <div className='space-y-0.5 min-w-0 flex-1 text-left'>
                      <FormLabel className='text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-primary italic leading-tight'>
                        {t('engineering.categoryArchive.dialog.active')}
                      </FormLabel>
                      <div className='text-[8px] sm:text-[9px] font-black uppercase tracking-tight text-muted-foreground/50 opacity-60 mt-0.5 wrap-break-word line-clamp-2 leading-none'>
                        {t('engineering.categoryArchive.dialog.activeDescription')}
                      </div>
                    </div>
                    <FormControl className='shrink-0'>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter className='p-4 sm:p-8 pt-2 sm:pt-4 border-t border-dashed border-muted/30'>
          <Button
            type='submit'
            form='product-type-form'
            disabled={isSubmitting}
            className='w-full sm:w-auto rounded-full h-10 sm:h-11 px-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all'
          >
            {isSubmitting
              ? t('engineering.categoryArchive.dialog.saving')
              : t('engineering.categoryArchive.dialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
