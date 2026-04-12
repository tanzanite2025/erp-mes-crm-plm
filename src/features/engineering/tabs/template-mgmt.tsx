'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutTemplate, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { normalizeComponentKey, normalizeMachineCode } from '@/lib/codecs/code-normalization'
import { SPEC_COMPONENTS } from '../components/specs'
import { localizeTemplateDefinitions } from '../data/template-defaults'
import { type ProductTemplate } from '../data/schema'
import { useProductTemplateWriteActions } from '../hooks/use-product-template-write-actions'
import { PRODUCT_TEMPLATES_QUERY_KEY } from '../query-keys'
import { productTemplateService } from '../services/product-template-service'
import { createProductTemplateDraft } from '../utils/default-builders'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return ''
}

export function TemplateMgmt() {
  const { t } = useLanguage()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ProductTemplate | null>(null)
  const { saveTemplate, deleteTemplate } = useProductTemplateWriteActions()
  const templatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
  })
  const templates = templatesQuery.data ?? []
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
    () => localizeTemplateDefinitions(templates, t),
    [t, templates]
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
    setEditingTemplate(createProductTemplateDraft())
    setIsDialogOpen(true)
  }

  const handleEdit = (template: ProductTemplate) => {
    setEditingTemplate({
      ...template,
      code: normalizeMachineCode(template.code),
      componentKey: normalizeComponentKey(template.componentKey) as ProductTemplate['componentKey'],
    })
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
    if (!editingTemplate?.name || !normalizeMachineCode(editingTemplate?.code)) {
      toast.error(t('engineering.templateMgmt.toasts.required'))
      return
    }

    try {
      const isEdit = Boolean(editingTemplate.id)
      await saveTemplate({
        formData: {
          ...editingTemplate,
          code: normalizeMachineCode(editingTemplate.code),
          componentKey: normalizeComponentKey(editingTemplate.componentKey) as ProductTemplate['componentKey'],
        },
        currentRow: templates.find((item) => item.id === editingTemplate.id),
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
          {displayTemplates.map((template) => (
            <Card
              key={template.id}
              className='group relative overflow-hidden rounded-[32px] border-dashed bg-muted/5 transition-all hover:border-blue-400/50 hover:bg-white hover:shadow-2xl'
            >
              <div className='absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-blue-600/30 via-transparent to-transparent' />
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
                      className='size-8 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500'
                      onClick={() => handleDelete(template.id)}
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
                  <p className='min-h-[3rem] text-[11px] font-black italic leading-relaxed text-slate-500'>
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
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'>
          <DialogHeader className='border-b border-dashed border-muted/50 bg-muted/5 px-8 py-4 text-start'>
            <DialogTitle className='flex items-center gap-3 text-lg font-black tracking-tighter italic text-slate-800'>
              <div className='size-2 animate-pulse rounded-full bg-blue-600' />
              {editingTemplate?.id
                ? t('engineering.templateMgmt.dialog.editTitle')
                : t('engineering.templateMgmt.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className='mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {t('engineering.templateMgmt.dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 px-8 py-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {t('engineering.templateMgmt.fields.name')}
              </Label>
              <Input
                placeholder={t('engineering.templateMgmt.placeholders.name')}
                className='h-12 rounded-2xl border-none bg-muted/50 font-black italic'
                value={editingTemplate?.name || ''}
                onChange={(event) =>
                  setEditingTemplate((prev) =>
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
                className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-black italic'
                value={editingTemplate?.code || ''}
                onChange={(event) =>
                  setEditingTemplate((prev) =>
                    prev ? { ...prev, code: normalizeMachineCode(event.target.value) } : null
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
                  setEditingTemplate((prev) =>
                    prev
                      ? {
                          ...prev,
                          componentKey: normalizeComponentKey(value) as ProductTemplate['componentKey'],
                        }
                      : null
                  )
                }
              >
                <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-black italic'>
                  <SelectValue placeholder={t('engineering.templateMgmt.placeholders.component')} />
                </SelectTrigger>
                <SelectContent className='rounded-2xl border-none shadow-2xl'>
                  {Object.keys(SPEC_COMPONENTS).map((key) => (
                    <SelectItem key={key} value={key} className='text-xs font-black italic'>
                      {componentLabels[key as keyof typeof componentLabels] ||
                        t('engineering.templateMgmt.components.GENERAL')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-[9px] font-bold italic text-blue-600/40'>
                {t('engineering.templateMgmt.hints.component')}
              </p>
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {t('engineering.templateMgmt.fields.description')}
              </Label>
              <Input
                placeholder={t('engineering.templateMgmt.placeholders.description')}
                className='h-12 rounded-2xl border-none bg-muted/50 font-black italic'
                value={editingTemplate?.description || ''}
                onChange={(event) =>
                  setEditingTemplate((prev) =>
                    prev ? { ...prev, description: event.target.value } : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter className='flex items-center justify-end gap-3 border-t border-dashed border-muted/50 bg-muted/5 px-8 py-4'>
            <Button
              variant='ghost'
              onClick={() => setIsDialogOpen(false)}
              className='h-10 rounded-full text-[10px] font-black uppercase'
            >
              {t('engineering.templateMgmt.buttons.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              className='h-10 rounded-full bg-blue-600 px-8 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700'
            >
              {t('engineering.templateMgmt.buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
