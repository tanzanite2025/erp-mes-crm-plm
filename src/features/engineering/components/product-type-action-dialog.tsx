'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { productTypeSchema, type ProductTemplate, type ProductType } from '../data/schema'
import { productService } from '../services/product-service'
import { productTemplateService } from '../services/product-template-service'

const logger = createLogger('ProductTypeActionDialog')

type ProductTypeForm = Omit<ProductType, 'parentId' | 'templateId'> & {
  parentId: string
  templateId: string
}

type ProductTypeActionDialogProps = {
  currentRow?: ProductType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: Partial<ProductType>) => void | Promise<void>
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
      createdAt: new Date().toISOString(),
    },
  })

  const categoryName = form.watch('name')
  const currentCode = form.watch('code')

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [storedTypes, storedTemplates] = await Promise.all([
          productService.getProductTypes(),
          productTemplateService.getTemplates(),
        ])

        setAllTypes(storedTypes || [])
        setAllTemplates(storedTemplates || [])
      } catch (error) {
        logger.error('Failed to load category dialog data', error)
      }

      if (isEdit && currentRow) {
        form.reset({
          ...currentRow,
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
        createdAt: new Date().toISOString(),
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

    if (canAutofill) {
      const tokens = CODE_RULES.flatMap((rule) =>
        rule.aliases.some((alias) => normalizedName.includes(alias)) ? [rule.code] : []
      )

      if (tokens.length > 0) {
        form.setValue('code', Array.from(new Set(tokens)).join('-'), {
          shouldValidate: true,
        })
      }
    }

    if (normalizedName.includes('圈') || normalizedName.includes('rim')) {
      const rimTemplate = allTemplates.find((template) => template.componentKey === 'RIM')
      if (rimTemplate) form.setValue('templateId', rimTemplate.id)
      return
    }

    if (normalizedName.includes('把立') || normalizedName.includes('stem')) {
      const stemTemplate = allTemplates.find((template) => template.componentKey === 'STEM')
      if (stemTemplate) form.setValue('templateId', stemTemplate.id)
      return
    }

    if (normalizedName.includes('前叉') || normalizedName.includes('fork')) {
      const forkTemplate = allTemplates.find((template) => template.componentKey === 'FORK')
      if (forkTemplate) form.setValue('templateId', forkTemplate.id)
    }
  }, [allTemplates, categoryName, currentCode, form, isEdit])

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

  const handleFormSubmit = async (values: ProductTypeForm) => {
    setIsSubmitting(true)

    try {
      const submissionData: Partial<ProductType> = {
        ...values,
        id: values.id || currentRow?.id,
        createdAt: values.createdAt || currentRow?.createdAt || new Date().toISOString(),
        parentId: values.parentId === 'root' ? undefined : values.parentId || undefined,
        templateId: values.templateId === 'none' ? undefined : values.templateId || undefined,
      }

      if (!isEdit && !submissionData.id) {
        delete submissionData.id
      }

      if (onSubmit) await onSubmit(submissionData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] sm:max-w-md p-0 overflow-hidden rounded-[24px] sm:rounded-[32px] border-none shadow-2xl'>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
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
                        ...allTemplates.map((template) => ({
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
              <FormField
                control={form.control}
                name='active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-2xl bg-muted/30 p-3 sm:p-4 shadow-sm border border-dashed border-primary/5 gap-4'>
                    <div className='space-y-0.5 min-w-0 flex-1 text-left'>
                      <FormLabel className='text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-primary italic leading-tight'>
                        {t('engineering.categoryArchive.dialog.active')}
                      </FormLabel>
                      <div className='text-[8px] sm:text-[9px] font-black uppercase tracking-tight text-muted-foreground/50 opacity-60 mt-0.5 break-words line-clamp-2 leading-none'>
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
