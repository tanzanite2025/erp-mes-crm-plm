'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
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
import { SelectDropdown } from '@/components/select-dropdown'
import {
  productTypeSchema,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import { localizeTemplateDefinitions } from '../data/template-defaults'
import { type SaveProductTypeInput } from '../mutation-types'
import { productTemplateService } from '../services/product-template-service'
import { ProductTypeService } from '../services/product-type-service'
import {
  normalizeEngineeringProductTypeCode,
  normalizeProductTypeEntity,
} from '../utils/product-code-normalization'
import {
  buildOrderedProductTypes,
  buildProductTypeHierarchyMetaMap,
} from '../utils/product-type-tree'

const logger = createLogger('ProductTypeActionDialog')
const MAX_PRODUCT_TYPE_LEVEL = 2

type ProductTypeForm = Omit<ProductType, 'parentId' | 'templateId'> & {
  parentId: string
  templateId: string
}

type ProductTypeActionDialogProps = {
  currentRow?: ProductType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: SaveProductTypeInput) => void | Promise<void>
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
  const watchedParentId = form.watch('parentId')
  const watchedTemplateId = form.watch('templateId')

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [storedTypes, storedTemplates] = await Promise.all([
          ProductTypeService.getProductTypes(),
          productTemplateService.getTemplates(),
        ])

        setAllTypes(storedTypes || [])
        setAllTemplates(storedTemplates || [])
      } catch (error) {
        logger.error('Failed to load category dialog data', error)
      }

      if (isEdit && currentRow) {
        form.reset({
          ...normalizeProductTypeEntity(currentRow),
          parentId: currentRow.parentId || 'root',
          templateId: currentRow.templateId || 'none',
        })
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
      rule.aliases.some((alias) => normalizedName.includes(alias))
        ? [rule.code]
        : []
    )

    if (tokens.length > 0) {
      form.setValue(
        'code',
        normalizeEngineeringProductTypeCode(
          Array.from(new Set(tokens)).join('-')
        ),
        {
          shouldValidate: true,
        }
      )
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

  const orderedTypes = useMemo(
    () => buildOrderedProductTypes(allTypes, true),
    [allTypes]
  )
  const hierarchyMetaMap = useMemo(
    () => buildProductTypeHierarchyMetaMap(allTypes, true),
    [allTypes]
  )
  const currentSubtreeHeight = currentRow
    ? (hierarchyMetaMap.get(currentRow.id)?.subtreeHeight ?? 0)
    : 0

  const selectableParents = useMemo(() => {
    const allowed = orderedTypes.filter((type) => {
      if (excludedIds.has(type.id)) return false

      const meta = hierarchyMetaMap.get(type.id)
      if (!meta) return false

      return meta.level + 1 + currentSubtreeHeight <= MAX_PRODUCT_TYPE_LEVEL
    })

    if (!isEdit || !currentRow?.parentId) {
      return allowed
    }

    const currentParent = orderedTypes.find(
      (type) => type.id === currentRow.parentId
    )
    if (
      !currentParent ||
      allowed.some((type) => type.id === currentParent.id)
    ) {
      return allowed
    }

    return [...allowed, currentParent]
  }, [
    currentRow?.parentId,
    currentSubtreeHeight,
    excludedIds,
    hierarchyMetaMap,
    isEdit,
    orderedTypes,
  ])

  const localizedTemplates = useMemo(
    () => localizeTemplateDefinitions(allTemplates, t),
    [allTemplates, t]
  )

  const resolveLevelLabel = useCallback(
    (level: number) => {
      if (level <= 0) return t('engineering.categoryArchive.labels.level1')
      if (level === 1) return t('engineering.categoryArchive.labels.level2')
      return t('engineering.categoryArchive.labels.level3')
    },
    [t]
  )

  const selectedParentMeta = useMemo(() => {
    if (!watchedParentId || watchedParentId === 'root') return null
    return hierarchyMetaMap.get(watchedParentId) || null
  }, [hierarchyMetaMap, watchedParentId])

  const targetLevel = selectedParentMeta ? selectedParentMeta.level + 1 : 0
  const targetLevelLabel = resolveLevelLabel(targetLevel)
  const targetRoleLabel =
    targetLevel >= MAX_PRODUCT_TYPE_LEVEL
      ? t('engineering.categoryArchive.labels.baseModel')
      : t('engineering.categoryArchive.labels.structureCategory')
  const parentPathLabel =
    selectedParentMeta?.pathLabel ||
    t('engineering.categoryArchive.dialog.parentNone')
  const parentItems = useMemo(
    () => [
      {
        label: t('engineering.categoryArchive.dialog.parentNone'),
        value: 'root',
      },
      ...selectableParents.map((type) => {
        const meta = hierarchyMetaMap.get(type.id)
        const levelLabel = resolveLevelLabel(meta?.level ?? 0)
        const pathLabel = meta?.pathLabel || type.name
        return {
          label: `${levelLabel} · ${pathLabel}`,
          value: type.id,
        }
      }),
    ],
    [hierarchyMetaMap, resolveLevelLabel, selectableParents, t]
  )
  const hierarchyHint =
    targetLevel <= 0
      ? t('engineering.categoryArchive.dialog.levelHintTop')
      : targetLevel === 1
        ? t('engineering.categoryArchive.dialog.levelHintMiddle')
        : t('engineering.categoryArchive.dialog.levelHintLeaf')

  const selectedTemplate = useMemo(() => {
    if (!watchedTemplateId || watchedTemplateId === 'none') return null
    return (
      allTemplates.find((template) => template.id === watchedTemplateId) || null
    )
  }, [allTemplates, watchedTemplateId])

  const templateAssembly = useMemo(
    () =>
      [...(selectedTemplate?.attributeBindings ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ),
    [selectedTemplate]
  )

  const handleFormSubmit = async (values: ProductTypeForm) => {
    setIsSubmitting(true)

    try {
      const parentLevel =
        values.parentId === 'root'
          ? -1
          : (hierarchyMetaMap.get(values.parentId)?.level ?? -1)
      const nextTargetLevel = parentLevel + 1

      if (nextTargetLevel + currentSubtreeHeight > MAX_PRODUCT_TYPE_LEVEL) {
        form.setError('parentId', {
          type: 'manual',
          message: t('engineering.categoryArchive.dialog.levelLimitError'),
        })
        return
      }

      const submissionData: SaveProductTypeInput = {
        ...normalizeProductTypeEntity(values),
        id: values.id || currentRow?.id,
        createdAt:
          values.createdAt || currentRow?.createdAt || new Date().toISOString(),
        parentId:
          values.parentId === 'root' ? undefined : values.parentId || undefined,
        templateId:
          values.templateId === 'none'
            ? undefined
            : values.templateId || undefined,
      }

      if (onSubmit) {
        await onSubmit(submissionData)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex w-[96vw] flex-col gap-0 overflow-hidden rounded-[24px] border-none p-0 shadow-2xl sm:max-w-4xl sm:rounded-[32px]'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <DialogHeader className='relative p-4 pb-2 sm:p-8'>
          <DialogTitle className='text-base font-black tracking-tighter text-primary uppercase italic sm:text-lg'>
            {isEdit
              ? t('engineering.categoryArchive.dialog.editTitle')
              : t('engineering.categoryArchive.dialog.createTitle')}
          </DialogTitle>
          <DialogDescription className='text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase opacity-60 sm:text-[9px]'>
            {isEdit
              ? t('engineering.categoryArchive.dialog.editDescription')
              : t('engineering.categoryArchive.dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='product-type-form'
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className='custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:space-y-6 sm:px-8 sm:pb-6'
          >
            <input type='hidden' {...form.register('id')} />
            <input type='hidden' {...form.register('createdAt')} />
            <input type='hidden' {...form.register('version')} />

            <div className='space-y-3 rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge
                  variant='outline'
                  className='border-primary/20 bg-white text-primary'
                >
                  {targetLevelLabel}
                </Badge>
                <Badge
                  variant='outline'
                  className={
                    targetLevel >= MAX_PRODUCT_TYPE_LEVEL
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }
                >
                  {targetRoleLabel}
                </Badge>
              </div>
              <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
                <div className='min-w-0 rounded-2xl border border-dashed border-primary/15 bg-white/80 px-3 py-2'>
                  <div className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('engineering.categoryArchive.dialog.targetLevel')}
                  </div>
                  <div className='mt-1 truncate text-[11px] font-black tracking-tight text-slate-800'>
                    {targetLevelLabel}
                  </div>
                </div>
                <div className='min-w-0 rounded-2xl border border-dashed border-primary/15 bg-white/80 px-3 py-2 lg:col-span-2'>
                  <div className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('engineering.categoryArchive.dialog.parentPath')}
                  </div>
                  <div className='mt-1 truncate text-[11px] font-black tracking-tight text-slate-800'>
                    {parentPathLabel}
                  </div>
                </div>
              </div>
              <div className='rounded-2xl border border-dashed border-primary/15 bg-white/70 px-3 py-2 text-[10px] leading-relaxed font-black text-slate-600'>
                {hierarchyHint}
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 pt-2 md:grid-cols-2 md:gap-6'>
              <FormField
                control={form.control}
                name='parentId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                      {t('engineering.categoryArchive.dialog.parent')}
                    </FormLabel>
                    <SelectDropdown
                      value={field.value}
                      onValueChange={field.onChange}
                      items={parentItems}
                      placeholder={t(
                        'engineering.categoryArchive.dialog.parentPlaceholder'
                      )}
                      isControlled={true}
                      className='h-12 w-full rounded-2xl border-none bg-muted/50 text-[11px] font-bold shadow-none'
                    />
                    <div className='mt-1 text-[10px] text-muted-foreground'>
                      {hierarchyHint}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                      {t('engineering.categoryArchive.dialog.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          'engineering.categoryArchive.dialog.namePlaceholder'
                        )}
                        className='h-12 rounded-2xl border-none bg-muted/50'
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
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                      {t('engineering.categoryArchive.dialog.code')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          'engineering.categoryArchive.dialog.codePlaceholder'
                        )}
                        className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold'
                        {...field}
                        value={field.value || ''}
                        onChange={(event) =>
                          field.onChange(
                            normalizeEngineeringProductTypeCode(
                              event.target.value
                            )
                          )
                        }
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
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                      {t('engineering.categoryArchive.dialog.description')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          'engineering.categoryArchive.dialog.descriptionPlaceholder'
                        )}
                        className='min-h-[80px] resize-none rounded-2xl border-none bg-muted/50'
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
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-blue-600 uppercase'>
                      {t('engineering.categoryArchive.dialog.template')}
                    </FormLabel>
                    <SelectDropdown
                      value={field.value}
                      onValueChange={field.onChange}
                      items={[
                        {
                          label: t(
                            'engineering.categoryArchive.dialog.templateNone'
                          ),
                          value: 'none',
                        },
                        ...localizedTemplates.map((template) => ({
                          label: template.name,
                          value: template.id,
                        })),
                      ]}
                      placeholder={t(
                        'engineering.categoryArchive.dialog.templatePlaceholder'
                      )}
                      isControlled={true}
                      className='h-12 w-full rounded-2xl border-none bg-muted/50 text-[11px] font-bold shadow-none'
                    />
                    <div className='mt-1 text-[10px] text-muted-foreground'>
                      {t('engineering.categoryArchive.dialog.templateHelp')}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='space-y-3 rounded-2xl border border-dashed border-blue-200/50 bg-blue-50/40 p-4 md:col-span-2'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-[10px] font-black tracking-widest text-blue-700 uppercase'>
                      {t(
                        'engineering.categoryArchive.dialog.templateAssemblyTitle'
                      )}
                    </div>
                    <div className='mt-1 text-[10px] text-muted-foreground'>
                      {selectedTemplate
                        ? t(
                            'engineering.categoryArchive.dialog.templateAssemblyCount',
                            { count: templateAssembly.length }
                          )
                        : t(
                            'engineering.categoryArchive.dialog.templateAssemblyEmpty'
                          )}
                    </div>
                  </div>
                  {selectedTemplate ? (
                    <Badge
                      variant='outline'
                      className='border-blue-200 bg-white text-blue-700'
                    >
                      {selectedTemplate.name}
                    </Badge>
                  ) : null}
                </div>

                {selectedTemplate ? (
                  <>
                    <div className='flex flex-wrap gap-2'>
                      {templateAssembly.length === 0 ? (
                        <div className='text-[11px] font-bold text-muted-foreground'>
                          {t(
                            'engineering.categoryArchive.dialog.templateAssemblyEmpty'
                          )}
                        </div>
                      ) : (
                        templateAssembly.map((binding) => (
                          <div
                            key={binding.categoryKey}
                            className='rounded-full border border-dashed border-blue-200 bg-white px-3 py-1 text-[10px] font-black tracking-wide text-slate-700'
                          >
                            {binding.categoryKey}
                            {' · '}
                            {binding.required
                              ? t(
                                  'engineering.categoryArchive.dialog.templateAssemblyRequired'
                                )
                              : t(
                                  'engineering.categoryArchive.dialog.templateAssemblyOptional'
                                )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className='rounded-2xl border border-dashed border-blue-100 bg-white/80 px-4 py-3 text-[11px] font-bold text-slate-600'>
                      {t(
                        'engineering.productMgmt.dialog.attributeBindingTemplateLabel',
                        {
                          name: selectedTemplate.name,
                        }
                      )}
                    </div>
                  </>
                ) : null}
              </div>
              <FormField
                control={form.control}
                name='active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/5 bg-muted/30 p-3 shadow-sm sm:p-4'>
                    <div className='min-w-0 flex-1 space-y-0.5 text-left'>
                      <FormLabel className='text-[10px] leading-tight font-black tracking-widest text-primary uppercase italic sm:text-[11px]'>
                        {t('engineering.categoryArchive.dialog.active')}
                      </FormLabel>
                      <div className='mt-0.5 line-clamp-2 text-[8px] leading-none font-black tracking-tight wrap-break-word text-muted-foreground/50 uppercase opacity-60 sm:text-[9px]'>
                        {t(
                          'engineering.categoryArchive.dialog.activeDescription'
                        )}
                      </div>
                    </div>
                    <FormControl className='shrink-0'>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter className='border-t border-dashed border-muted/30 p-4 pt-2 sm:p-8 sm:pt-4'>
          <Button
            type='submit'
            form='product-type-form'
            disabled={isSubmitting}
            className='h-10 w-full rounded-full px-10 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 sm:h-11 sm:w-auto'
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
