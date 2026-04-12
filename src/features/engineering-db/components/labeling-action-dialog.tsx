'use client'

import { useCallback, useMemo } from 'react'
import { Sticker, Hash, Tag, Save, Layers, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { FileUploader } from '@/components/file-uploader'
import {
  labelingDraftInputSchema,
  type LabelingDraft,
  type LabelingDraftInput,
} from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'

type LabelingFormState = LabelingDraftInput & { id?: string; createdAt?: string }
type LabelingFormUpdater = LabelingFormState | ((prev: LabelingFormState) => LabelingFormState)

interface LabelingActionDialogProps {
  currentRow?: LabelingDraft | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    data: LabelingDraftInput
    recordId?: string
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => Promise<void>
  isLoading?: boolean
}

const DEFAULT_LABELING: LabelingDraftInput = {
  name: '',
  type: 'Water',
  productId: '',
  fileUrl: '',
  fileExtension: '',
  version: 1,
}

export function LabelingActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: LabelingActionDialogProps) {
  const { data: products = [] } = useGetProducts()

  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[700px] rounded-[32px] overflow-hidden',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer: 'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const isEdit = !!currentRow
  const initialFormData = useMemo<LabelingFormState>(() => {
    if (currentRow) return currentRow
    return { ...DEFAULT_LABELING }
  }, [currentRow])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const setFormData = useCallback((updater: LabelingFormUpdater) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      Object.assign(formData, next)
    } else {
      Object.assign(formData, updater)
    }
  }, [formData])

  const updateField = useCallback(<K extends keyof LabelingFormState>(field: K, value: LabelingFormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [setFormData])

  const handleSave = async () => {
    const parsed = labelingDraftInputSchema.safeParse(formData)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '请上传设计稿并填写方案名称')
      return
    }

    const payload = parsed.data
    if (isEdit && currentRow) {
      const delta = tracker.commit()
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }

      await onSave({
        data: payload,
        recordId: currentRow.id,
        isPatch: true,
        delta,
        version: currentRow.version,
      })
      return
    }

    await onSave({ data: payload, isPatch: false })
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <div className='rounded-xl bg-teal-500/10 p-2'>
            <Sticker className='size-5 text-teal-600' />
          </div>
          {isEdit ? '编辑贴标设计' : '发布贴标方案'}
        </>
      }
      description='DESIGN_MASTER_LABELING / 管理水标、涂装、激光等外观方案与适配关系。'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <p className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-teal-500 animate-pulse' />
            Sync_to_Visual_Identity
          </p>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
            >
              取消 / Cancel
            </Button>
            <Button
              disabled={isLoading || (isEdit && !isDirty())}
              onClick={handleSave}
              className='h-11 gap-2 rounded-full bg-teal-600 px-10 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-teal-600/20 transition-all active:scale-95 hover:bg-teal-700'
            >
              {isLoading ? (
                <span className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              ) : (
                <Save className='size-4' />
              )}
              同步存档 / Sync
            </Button>
          </div>
        </>
      }
    >
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-teal-500/5 via-transparent' />

      <div className='relative grid gap-8'>
        <div className='space-y-4 rounded-[32px] border border-dashed border-teal-500/20 bg-teal-500/5 p-6'>
          <div className='flex items-center justify-between'>
            <p className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-600/70'>
              <Layers className='size-3' /> 设计源文件 / Design Asset
            </p>
          </div>
          <FileUploader
            value={formData.fileUrl}
            accept='image/*,.pdf,.ai,.eps'
            onChange={(url, ext) => {
              setFormData((prev) => ({
                ...prev,
                fileUrl: url,
                fileExtension: ext || prev.fileExtension,
              }))
            }}
          />
        </div>

        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              <Tag className='size-3' /> 方案名称 / Scheme Name
            </Label>
            <Input
              placeholder='例如：DT-SWISS-2025-V1-Water'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black shadow-inner focus-visible:ring-teal-500/20'
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              <Layers className='size-3' /> 工艺类型 / Tech Type
            </Label>
            <SelectDropdown
              defaultValue={formData.type}
              onValueChange={(value) => updateField('type', value as LabelingDraftInput['type'])}
              items={[
                { label: '水标 / Water Decal', value: 'Water' },
                { label: '涂装 / Paint', value: 'Paint' },
                { label: '激光 / Laser', value: 'Laser' },
                { label: '其他 / Other', value: 'Other' },
              ]}
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-bold italic shadow-inner'
            />
          </div>
        </div>

        <div className='space-y-4 rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/10 p-6'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              <Package className='size-3' /> 适配成品 / Target Product
            </Label>
            <SelectDropdown
              defaultValue={formData.productId || 'generic'}
              onValueChange={(value) => updateField('productId', value === 'generic' ? '' : value)}
              items={[
                { label: '-- 通用方案 / Generic --', value: 'generic' },
                ...products.map((product) => ({
                  label: `${product.sku} | ${product.name}`,
                  value: product.id,
                })),
              ]}
              placeholder='选择适配的成品 SKU'
              className='h-12 rounded-2xl border-none bg-background px-5 text-sm font-bold italic shadow-sm'
            />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-6 grayscale opacity-40 pointer-events-none'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>资源标识 / Asset UID</Label>
            <Input
              readOnly
              className='h-10 rounded-xl border-none bg-muted/20 px-5 font-mono text-xs'
              value={formData.id ?? '--'}
            />
          </div>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              <Hash className='size-3' /> 数据版本 / Version
            </Label>
            <Input
              readOnly
              className='h-10 rounded-xl border-none bg-muted/20 px-5 font-mono text-xs'
              value={`REV.${formData.version ?? 1}`}
            />
          </div>
        </div>
      </div>
    </ActionDialogShell>
  )
}
