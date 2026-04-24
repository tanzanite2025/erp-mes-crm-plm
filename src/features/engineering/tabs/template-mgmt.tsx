'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutTemplate, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { TemplateEditorDialog } from '../components/template-mgmt/template-editor-dialog'
import { DEFAULT_PRODUCT_TEMPLATES, localizeTemplateDefinitions } from '../data/template-defaults'
import { type ProductTemplate } from '../data/schema'
import { useProductTemplateWriteActions } from '../hooks/use-product-template-write-actions'
import { PRODUCT_TEMPLATES_QUERY_KEY } from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { productTemplateService } from '../services/product-template-service'
import {
  normalizeEngineeringTemplateCode,
  normalizeProductTemplateEntity,
} from '../utils/product-code-normalization'
import { createProductTemplateDraft } from '../utils/default-builders'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return ''
}

export function TemplateMgmt() {
  const { t, locale } = useLanguage()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ProductTemplate | null>(null)
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('')
  const { saveTemplate, deleteTemplate } = useProductTemplateWriteActions()
  const templatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
  })
  const categoriesQuery = useQuery({
    queryKey: ['engineering', 'product-attribute-categories', 'active-options'],
    queryFn: () => ProductAttributeCategoryService.getProductAttributeCategories({ activeOnly: true }),
  })
  if (templatesQuery.isSuccess && !templatesQuery.data) throw new Error('[CRITICAL] Templates Data missing')
  if (categoriesQuery.isSuccess && !categoriesQuery.data) throw new Error('[CRITICAL] Categories Data missing')

  const templates = templatesQuery.data
  const categories = categoriesQuery.data
  const error = templatesQuery.error

  const componentLabels = useMemo(
    () => ({
      RIM: t('engineering.templateMgmt.components.RIM'),
      STEM: t('engineering.templateMgmt.components.STEM'),
      FORK: t('engineering.templateMgmt.components.FORK'),
      GENERAL: t('engineering.templateMgmt.components.GENERAL'),
    }),
    [t]
  )

  const displayTemplates = useMemo(
    () => {
      if (!templates) return []
      return localizeTemplateDefinitions(templates, t)
    },
    [t, templates]
  )
  const presetTemplateCodes = useMemo(
    () => new Set(DEFAULT_PRODUCT_TEMPLATES.map((template) => template.code)),
    []
  )

  const assembledCategories = useMemo(() => {
    if (!editingTemplate || !categories) return []
    return (editingTemplate.attributeBindings ?? [])
      .map((binding) => ({
        binding,
        category: categories.find((item) => item.key === binding.categoryKey),
      }))
      .sort((a, b) => (a.binding.sortOrder ?? 0) - (b.binding.sortOrder ?? 0))
  }, [categories, editingTemplate])

  const availableCategories = useMemo(() => {
    if (!categories) return []
    const used = new Set((editingTemplate?.attributeBindings ?? []).map((item) => item.categoryKey))
    return categories.filter((item) => item.active && !used.has(item.key))
  }, [categories, editingTemplate])

  useEffect(() => {
    if (!error) return
    toast.error(
      t('engineering.templateMgmt.toasts.loadFailed', {
        message: getErrorMessage(error),
      })
    )
  }, [error, t])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const handleAdd = () => {
    setEditingTemplate(createProductTemplateDraft())
    setSelectedCategoryKey('')
    setIsDialogOpen(true)
  }

  const handleEdit = (template: ProductTemplate) => {
    setEditingTemplate(normalizeProductTemplateEntity(template))
    setSelectedCategoryKey('')
    setIsDialogOpen(true)
  }

  const handleAddAttributeBinding = () => {
    if (!selectedCategoryKey) return
    setEditingTemplate((prev) => {
      if (!prev) return prev
      const nextBindings = [...(prev.attributeBindings ?? [])]
      if (nextBindings.some((item) => item.categoryKey === selectedCategoryKey)) {
        return prev
      }
      nextBindings.push({
        templateId: prev.id || undefined,
        categoryKey: selectedCategoryKey,
        sortOrder: nextBindings.length + 1,
        required: false,
        active: true,
        version: 1,
      })
      return { ...prev, attributeBindings: nextBindings }
    })
    setSelectedCategoryKey('')
  }

  const handleRemoveAttributeBinding = (categoryKey: string) => {
    setEditingTemplate((prev) => {
      if (!prev) return prev
      const nextBindings = (prev.attributeBindings ?? [])
        .filter((item) => item.categoryKey !== categoryKey)
        .map((item, index) => ({ ...item, sortOrder: index + 1 }))
      return { ...prev, attributeBindings: nextBindings }
    })
  }

  const handleToggleRequired = (categoryKey: string, checked: boolean) => {
    setEditingTemplate((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        attributeBindings: (prev.attributeBindings ?? []).map((item) =>
          item.categoryKey === categoryKey ? { ...item, required: checked } : item
        ),
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('engineering.templateMgmt.confirms.delete'))) return

    try {
      await deleteTemplate(id)
      toast.success(t('engineering.templateMgmt.toasts.deleteSuccess'))
    } catch (error) {
      toast.error(
        t('engineering.templateMgmt.toasts.deleteFailed', {
          message: getErrorMessage(error),
        })
      )
    }
  }

  const handleSubmit = async () => {
    if (!editingTemplate?.name || !normalizeEngineeringTemplateCode(editingTemplate?.code)) {
      toast.error(t('engineering.templateMgmt.toasts.required'))
      return
    }

    try {
      const isEdit = Boolean(editingTemplate.id)
      await saveTemplate({
        formData: normalizeProductTemplateEntity(editingTemplate),
        currentRow: templates?.find((item) => item.id === editingTemplate.id),
      })
      toast.success(
        isEdit
          ? t('engineering.templateMgmt.toasts.saveUpdated')
          : t('engineering.templateMgmt.toasts.saveCreated')
      )
      setIsDialogOpen(false)
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(t('engineering.templateMgmt.toasts.conflict'))
        return
      }

      toast.error(
        t('engineering.templateMgmt.toasts.saveFailed', {
          message: getErrorMessage(error),
        })
      )
    }
  }

  return (
    <div className='flex flex-col gap-4 animate-in fade-in duration-700 sm:gap-8'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <LayoutTemplate className='size-4 text-primary' />
          <h3 className='text-lg font-black uppercase tracking-tighter italic'>
            {t('engineering.templateMgmt.header.title')}
          </h3>
        </div>
        <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60'>
          {t('engineering.templateMgmt.header.description')}
        </p>
      </div>

      <div className='flex flex-col items-stretch justify-between gap-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:flex-row sm:items-center sm:p-6'>
        <div className='flex items-center gap-2'>
          <RefreshCw className='size-4 animate-spin-slow text-blue-600/40 sm:size-5' />
          <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('engineering.templateMgmt.status.synced')}
          </span>
        </div>
        <Button
          onClick={handleAdd}
          className='h-11 rounded-full bg-blue-600 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95'
        >
          <Plus className='mr-2 size-4' />
          {t('engineering.templateMgmt.actions.create')}
        </Button>
      </div>

      {displayTemplates.length === 0 ? (
        <div className='flex h-[350px] flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-muted/20 bg-muted/5 p-6 text-center sm:h-[400px] sm:p-12'>
          <div className='mb-6 flex size-16 items-center justify-center rounded-full bg-white shadow-xl'>
            <LayoutTemplate className='size-8 text-blue-600/20' />
          </div>
          <h3 className='mb-2 text-xl font-black tracking-tighter italic text-slate-800'>
            {t('engineering.templateMgmt.empty.title')}
          </h3>
          <p className='mb-8 max-w-sm text-xs font-black text-muted-foreground/40'>
            {t('engineering.templateMgmt.empty.description')}
          </p>
          <Button onClick={handleAdd} variant='link' className='font-bold text-blue-600'>
            {t('engineering.templateMgmt.empty.create')}
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
          {displayTemplates.map((template) => {
            const isPresetTemplate = presetTemplateCodes.has(template.code)

            return (
            <Card
              key={template.id}
              className='group relative overflow-hidden rounded-[32px] border-dashed bg-muted/5 transition-all hover:border-blue-400/50 hover:bg-white hover:shadow-2xl'
            >
              <div className='absolute left-0 top-0 h-1 w-full bg-linear-to-r from-blue-600/30 via-transparent to-transparent' />
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <div className='flex size-10 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 shadow-inner'>
                    <Settings2 className='size-5' />
                  </div>
                  <div className='flex gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                      onClick={() => handleEdit(template)}
                    >
                      <Settings2 className='size-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className={`size-8 rounded-full ${
                        isPresetTemplate
                          ? 'cursor-not-allowed text-slate-300 opacity-60 hover:bg-transparent hover:text-slate-300'
                          : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                      }`}
                      onClick={() => {
                        if (isPresetTemplate) return
                        void handleDelete(template.id)
                      }}
                      disabled={isPresetTemplate}
                      title={isPresetTemplate ? '系统预置模板不可删除' : undefined}
                      aria-label={isPresetTemplate ? '系统预置模板不可删除' : undefined}
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                </div>
                <CardTitle className='mt-6 text-sm font-black uppercase tracking-tighter italic text-slate-800'>
                  {template.name}
                </CardTitle>
                <CardDescription className='font-mono text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('engineering.templateMgmt.card.idLabel', { code: template.code })}
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-2'>
                <div className='space-y-6'>
                  <p className='min-h-12 text-[11px] font-black italic leading-relaxed text-slate-500'>
                    {template.description || t('engineering.templateMgmt.card.descriptionFallback')}
                  </p>
                  <div className='flex items-end justify-between border-t border-dashed border-muted/50 pt-6'>
                    <div className='flex flex-col gap-1'>
                      <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                        {t('engineering.templateMgmt.card.componentLabel')}
                      </span>
                      <span className='text-[10px] font-black italic text-blue-600'>
                        {componentLabels[template.componentKey as keyof typeof componentLabels] ||
                          t('engineering.templateMgmt.components.GENERAL')}
                      </span>
                    </div>
                    <div
                      className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${
                        template.active
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-slate-500/10 text-slate-500'
                      }`}
                    >
                      {template.active
                        ? t('engineering.templateMgmt.card.active')
                        : t('engineering.templateMgmt.card.inactive')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      <TemplateEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingTemplate={editingTemplate}
        selectedCategoryKey={selectedCategoryKey}
        onSelectedCategoryKeyChange={setSelectedCategoryKey}
        onTemplateChange={setEditingTemplate}
        onAddAttributeBinding={handleAddAttributeBinding}
        onRemoveAttributeBinding={handleRemoveAttributeBinding}
        onToggleRequired={handleToggleRequired}
        onSubmit={handleSubmit}
        locale={locale}
        t={t}
        componentLabels={componentLabels}
        assembledCategories={assembledCategories}
        availableCategories={availableCategories}
      />
    </div>
  )
}
