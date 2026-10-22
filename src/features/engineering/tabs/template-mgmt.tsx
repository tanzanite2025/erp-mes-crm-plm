'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutTemplate,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ForbiddenState } from '@/components/forbidden-state'
import { TemplateEditorDialog } from '../components/template-mgmt/template-editor-dialog'
import { type ProductTemplate } from '../data/schema'
import {
  DEFAULT_PRODUCT_TEMPLATES,
  localizeTemplateDefinitions,
} from '../data/template-defaults'
import { useProductTemplateWriteActions } from '../hooks/use-product-template-write-actions'
import { PRODUCT_TEMPLATES_QUERY_KEY } from '../query-keys'
import { productTemplateService } from '../services/product-template-service'
import { createProductTemplateDraft } from '../utils/default-builders'
import { normalizeProductTemplateEntity } from '../utils/product-code-normalization'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return ''
}

export function TemplateMgmt() {
  const { t, locale } = useLanguage()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] =
    useState<ProductTemplate | null>(null)
  const editingTemplateBaselineRef = useRef<ProductTemplate | undefined>(
    undefined
  )
  const templateSaveInProgressRef = useRef(false)
  const { saveTemplate, deleteTemplate, isSavingTemplate } =
    useProductTemplateWriteActions()
  const templatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
  })
  if (templatesQuery.isSuccess && !templatesQuery.data)
    throw new Error('[CRITICAL] Templates Data missing')

  const templates = templatesQuery.data
  const error = templatesQuery.error

  const displayTemplates = useMemo(() => {
    if (!templates) return []
    return localizeTemplateDefinitions(templates, t)
  }, [t, templates])
  const presetTemplateCodes = useMemo(
    () => new Set(DEFAULT_PRODUCT_TEMPLATES.map((template) => template.code)),
    []
  )

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
    editingTemplateBaselineRef.current = undefined
    setEditingTemplate(createProductTemplateDraft())
    setIsDialogOpen(true)
  }

  const handleEdit = (template: ProductTemplate) => {
    editingTemplateBaselineRef.current =
      templates?.find((item) => item.id === template.id) ?? template
    setEditingTemplate(normalizeProductTemplateEntity(template))
    setIsDialogOpen(true)
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
    if (templateSaveInProgressRef.current) return
    if (!editingTemplate?.name.trim()) {
      toast.error(t('engineering.templateMgmt.toasts.required'))
      return
    }
    templateSaveInProgressRef.current = true
    try {
      const isEdit = Boolean(editingTemplate.id)
      await saveTemplate({
        formData: normalizeProductTemplateEntity({
          ...editingTemplate,
          name: editingTemplate.name.trim(),
          description: editingTemplate.description?.trim(),
        }),
        currentRow: editingTemplateBaselineRef.current,
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
    } finally {
      templateSaveInProgressRef.current = false
    }
  }

  return (
    <div className='flex animate-in flex-col gap-4 duration-700 fade-in sm:gap-8'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <LayoutTemplate className='size-4 text-primary' />
          <h3 className='text-lg font-black tracking-tighter uppercase'>
            {t('engineering.templateMgmt.header.title')}
          </h3>
        </div>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
          {t('engineering.templateMgmt.header.description')}
        </p>
      </div>

      <div className='flex flex-col items-stretch justify-between gap-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:flex-row sm:items-center sm:p-6'>
        <div className='flex items-center gap-2'>
          <RefreshCw className='animate-spin-slow size-4 text-blue-600/40 sm:size-5' />
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
            {t('engineering.templateMgmt.status.synced')}
          </span>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            onClick={handleAdd}
            className='h-11 rounded-full bg-blue-600 px-8 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-blue-500/20 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95'
          >
            <Plus className='mr-2 size-4' />
            {t('engineering.templateMgmt.actions.create')}
          </Button>
        </div>
      </div>

      {displayTemplates.length === 0 ? (
        <div className='flex h-[350px] flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-muted/20 bg-muted/5 p-6 text-center sm:h-[400px] sm:p-12'>
          <div className='mb-6 flex size-16 items-center justify-center rounded-full bg-white shadow-xl'>
            <LayoutTemplate className='size-8 text-blue-600/20' />
          </div>
          <h3 className='mb-2 text-xl font-black tracking-tighter text-slate-800'>
            {t('engineering.templateMgmt.empty.title')}
          </h3>
          <p className='mb-8 max-w-sm text-xs font-black text-muted-foreground/40'>
            {t('engineering.templateMgmt.empty.description')}
          </p>
          <Button
            onClick={handleAdd}
            variant='link'
            className='font-bold text-blue-600'
          >
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
                <div className='absolute top-0 left-0 h-1 w-full bg-linear-to-r from-blue-600/30 via-transparent to-transparent' />
                <CardHeader className='pb-1'>
                  <div className='flex items-start justify-between'>
                    <div className='flex size-9 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 shadow-inner'>
                      <Settings2 className='size-4' />
                    </div>
                    <div className='flex gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-7 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                        aria-label={`${t('engineering.templateMgmt.dialog.editTitle')} · ${template.name}`}
                        onClick={() => handleEdit(template)}
                      >
                        <Settings2 className='size-3.5' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className={`size-7 rounded-full ${
                          isPresetTemplate
                            ? 'cursor-not-allowed text-slate-300 opacity-60 hover:bg-transparent hover:text-slate-300'
                            : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                        }`}
                        onClick={() => {
                          if (isPresetTemplate) return
                          void handleDelete(template.id)
                        }}
                        disabled={isPresetTemplate}
                        title={
                          isPresetTemplate ? '系统预置模板不可删除' : undefined
                        }
                        aria-label={
                          isPresetTemplate ? '系统预置模板不可删除' : undefined
                        }
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className='mt-1 text-sm font-black tracking-tighter text-slate-800 uppercase'>
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-0'>
                  <div className='space-y-2'>
                    <p className='line-clamp-2 min-h-0 text-[11px] leading-relaxed font-black text-slate-500'>
                      {template.description ||
                        t('engineering.templateMgmt.card.descriptionFallback')}
                    </p>
                    <div className='flex items-end justify-between border-t border-dashed border-muted/50 pt-2'>
                      <span className='text-xs text-muted-foreground'>
                        {t(
                          'engineering.templateMgmt.assembly.levelOneCategoryCount',
                          {
                            count: template.attributeBindings?.length ?? 0,
                          }
                        )}
                      </span>
                      <div
                        className={`rounded-full px-2.5 py-1 text-[8px] font-black tracking-widest uppercase ${
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
            )
          })}
        </div>
      )}

      <TemplateEditorDialog
        open={isDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!templateSaveInProgressRef.current) setIsDialogOpen(nextOpen)
        }}
        editingTemplate={editingTemplate}
        onTemplateChange={setEditingTemplate}
        onSubmit={handleSubmit}
        isSaving={isSavingTemplate}
        locale={locale}
        t={t}
      />
    </div>
  )
}
