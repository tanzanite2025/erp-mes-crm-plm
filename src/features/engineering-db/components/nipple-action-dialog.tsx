'use client'

import { useCallback, useMemo, useState } from 'react'
import { Nut, Hash, Tag, Info, Save, Layers } from 'lucide-react'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { FileUploader } from '@/components/file-uploader'
import type { Nipple } from '../data/nipple-schema'

type NippleFormState = Nipple
type NippleFormUpdater =
  | NippleFormState
  | ((prev: NippleFormState) => NippleFormState)

interface NippleActionDialogProps {
  currentRow?: Nipple | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    data: Nipple
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => void
  isLoading?: boolean
}

const DEFAULT_NIPPLE: Partial<Nipple> = {
  name: '',
  brand: '',
  material: '',
  length: '',
  color: '',
  fileUrl: '',
  fileExtension: '',
  version: 1,
}

export function NippleActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: NippleActionDialogProps) {
  const [draftId] = useState(
    () => `NIP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  )
  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[650px] rounded-[32px] overflow-hidden',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title:
      'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer:
      'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const isEdit = !!currentRow
  const initialFormData = useMemo(() => {
    if (currentRow) return currentRow
    return {
      ...DEFAULT_NIPPLE,
      id: draftId,
      createdAt: new Date().toISOString(),
    } as Nipple
  }, [currentRow, draftId])

  const {
    data: formData,
    tracker,
    isDirty,
  } = useDeltaTracker(initialFormData, open)

  const setFormData = useCallback(
    (updater: NippleFormUpdater) => {
      if (typeof updater === 'function') {
        const next = updater(formData)
        Object.assign(formData, next)
      } else {
        Object.assign(formData, updater)
      }
    },
    [formData]
  )

  const updateField = useCallback(
    <K extends keyof Nipple>(field: K, value: Nipple[K]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    [setFormData]
  )

  const handleSave = () => {
    if (!formData.name) {
      toast.error('请填写条帽名称')
      return
    }

    if (isEdit && currentRow) {
      const delta = tracker.commit()
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }
      onSave({
        data: formData,
        isPatch: true,
        delta,
        version: currentRow.version,
      })
    } else {
      onSave({ data: formData, isPatch: false })
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <div className='rounded-xl bg-orange-500/10 p-2'>
            <Nut className='size-5 text-orange-500' />
          </div>
          {isEdit ? '编辑条帽参数' : '建立条帽基准'}
        </>
      }
      description='COMPONENT_MASTER_NIPPLE / 定义条帽长度、材质与颜色特征，确保装配兼容性。'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <p className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-50'>
            <span className='inline-block size-1.5 animate-pulse rounded-full bg-orange-500' />
            Sync_to_BOM_Engine
          </p>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              取消 / CANCEL
            </Button>
            <Button
              disabled={isLoading || (isEdit && !isDirty())}
              onClick={handleSave}
              className='h-11 gap-2 rounded-full bg-orange-600 px-10 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-orange-600/20 transition-all hover:bg-orange-700 active:scale-95'
            >
              {isLoading ? (
                <span className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              ) : (
                <Save className='size-4' />
              )}
              同步存档 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      }
    >
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-orange-500/5 via-transparent' />

      <div className='relative grid gap-8'>
        {/* 核心标识组 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              <Tag className='size-3' /> 条帽名称 / NIPPLE_NAME
            </Label>
            <Input
              placeholder='例如: Brass-12mm-Black'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black shadow-inner focus-visible:ring-orange-500/20'
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              <Hash className='size-3' /> 系统编码 / INTERNAL_ID
            </Label>
            <Input
              readOnly
              className='h-12 cursor-not-allowed rounded-2xl border-none bg-muted/20 px-5 font-mono text-xs font-bold opacity-60'
              value={formData.id}
            />
          </div>
        </div>

        {/* 品牌与材质 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              品牌 / BRAND
            </Label>
            <Input
              placeholder='输入品牌名称'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-bold shadow-inner'
              value={formData.brand}
              onChange={(e) => updateField('brand', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              材质 / MATERIAL
            </Label>
            <Input
              placeholder='例如: Brass / Aluminum'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-bold shadow-inner'
              value={formData.material}
              onChange={(e) => updateField('material', e.target.value)}
            />
          </div>
        </div>

        {/* 规格参数 */}
        <div className='space-y-6 rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/10 p-6'>
          <div className='flex items-center justify-between'>
            <p className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-orange-600/70 uppercase'>
              <Layers className='size-3' /> 规格定义 / SPECIFICATION
            </p>
            <div className='mx-4 h-px flex-1 bg-muted-foreground/10' />
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                长度 / LENGTH (MM)
              </Label>
              <Input
                placeholder='例如: 12 / 14 / 16'
                className='h-12 rounded-2xl border-none bg-background px-5 font-mono text-sm font-black shadow-sm'
                value={formData.length}
                onChange={(e) => updateField('length', e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                颜色 / COLOR
              </Label>
              <Input
                placeholder='例如: Black / Silver'
                className='h-12 rounded-2xl border-none bg-background px-5 text-sm font-black shadow-sm'
                value={formData.color}
                onChange={(e) => updateField('color', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 附件上传 */}
        <div className='space-y-3 rounded-[32px] border border-dashed border-orange-500/20 bg-orange-500/5 p-6'>
          <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-orange-600/60 uppercase'>
            <Info className='size-3' /> 附件存档 / DOCUMENTATION
          </Label>
          <FileUploader
            value={formData.fileUrl}
            accept='image/*'
            onChange={(url, ext) => {
              setFormData((prev) => ({
                ...prev,
                fileUrl: url,
                fileExtension: ext || prev.fileExtension,
              }))
            }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
