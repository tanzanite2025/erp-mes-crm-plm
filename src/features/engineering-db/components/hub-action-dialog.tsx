'use client'

import { useCallback, useMemo } from 'react'
import { Box, Hash, Tag, Info, Save, Cpu } from 'lucide-react'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { FileUploader } from '@/components/file-uploader'
import type { Hub } from '../data/hub-schema'

type HubFormState = Hub
type HubFormUpdater = HubFormState | ((prev: HubFormState) => HubFormState)

interface HubActionDialogProps {
  currentRow?: Hub | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    data: Hub
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => void
  isLoading?: boolean
}

const DEFAULT_HUB: Partial<Hub> = {
  name: '',
  brand: '',
  model: '',
  holeCount: '',
  pcdLeft: '',
  pcdRight: '',
  flangeLeft: '',
  flangeRight: '',
  fileUrl: '',
  fileExtension: '',
  version: 1,
}

export function HubActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: HubActionDialogProps) {
  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[700px] rounded-[32px] overflow-hidden',
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
      ...DEFAULT_HUB,
      // [BACKEND-AUTHORITY]: 物理 ID 严禁在前端使用 Math.random 生成，必须由后端数据库在创建时分配。
      id: '',
      createdAt: new Date().toISOString(),
    } as Hub
  }, [currentRow])

  const {
    data: formData,
    tracker,
    isDirty,
  } = useDeltaTracker(initialFormData, open)

  const setFormData = useCallback(
    (updater: HubFormUpdater) => {
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
    <K extends keyof Hub>(field: K, value: Hub[K]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    [setFormData]
  )

  const handleSave = () => {
    if (!formData.name) {
      toast.error('请填写花鼓名称')
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
          <div className='rounded-xl bg-indigo-500/10 p-2'>
            <Box className='size-5 text-indigo-500' />
          </div>
          {isEdit ? '编辑花鼓参数' : '建立花鼓基准'}
        </>
      }
      description='COMPONENT_MASTER_HUB / 定义花鼓核心几何特征，确保辐条长度计算精度。'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <p className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-50'>
            <span className='inline-block size-1.5 animate-pulse rounded-full bg-indigo-500' />
            Sync_to_Geometry_Engine
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
              className='h-11 gap-2 rounded-full bg-indigo-600 px-10 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-95'
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
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent' />

      <div className='relative grid gap-8'>
        {/* 核心标识组 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              <Tag className='size-3' /> 花鼓名称 / HUB_NAME
            </Label>
            <Input
              placeholder='例如: SHIMANO-M8100'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black shadow-inner focus-visible:ring-indigo-500/20'
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

        {/* 品牌与型号 */}
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
              型号 / MODEL
            </Label>
            <Input
              placeholder='输入型号编码'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-bold shadow-inner'
              value={formData.model}
              onChange={(e) => updateField('model', e.target.value)}
            />
          </div>
        </div>

        {/* 核心几何数值 */}
        <div className='space-y-6 rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/10 p-6'>
          <div className='flex items-center justify-between'>
            <p className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-indigo-600/70 uppercase'>
              <Cpu className='size-3' /> 几何计算参数 / GEOMETRY_PROPERTIES
            </p>
            <div className='mx-4 h-px flex-1 bg-muted-foreground/10' />
            <span className='font-mono text-[8px] text-muted-foreground'>
              (UNIT: MM)
            </span>
          </div>

          <div className='grid grid-cols-2 gap-4 lg:grid-cols-5'>
            <div className='space-y-2'>
              <Label className='text-[9px] font-bold opacity-60'>
                孔数 / HOLES
              </Label>
              <Input
                className='h-10 rounded-xl border-none bg-background font-mono shadow-sm'
                value={formData.holeCount}
                onChange={(e) => updateField('holeCount', e.target.value)}
              />
            </div>
            <div className='space-y-2 text-indigo-600'>
              <Label className='text-[9px] font-bold'>PCD_LEFT</Label>
              <Input
                className='h-10 rounded-xl border-none bg-background font-mono shadow-sm'
                value={formData.pcdLeft}
                onChange={(e) => updateField('pcdLeft', e.target.value)}
              />
            </div>
            <div className='space-y-2 text-indigo-600'>
              <Label className='text-[9px] font-bold'>PCD_RIGHT</Label>
              <Input
                className='h-10 rounded-xl border-none bg-background font-mono shadow-sm'
                value={formData.pcdRight}
                onChange={(e) => updateField('pcdRight', e.target.value)}
              />
            </div>
            <div className='space-y-2 text-amber-600'>
              <Label className='text-[9px] font-bold'>FL_LEFT</Label>
              <Input
                className='h-10 rounded-xl border-none bg-background font-mono shadow-sm'
                value={formData.flangeLeft}
                onChange={(e) => updateField('flangeLeft', e.target.value)}
              />
            </div>
            <div className='space-y-2 text-amber-600'>
              <Label className='text-[9px] font-bold'>FL_RIGHT</Label>
              <Input
                className='h-10 rounded-xl border-none bg-background font-mono shadow-sm'
                value={formData.flangeRight}
                onChange={(e) => updateField('flangeRight', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 附件上传 */}
        <div className='space-y-3 rounded-[32px] border border-dashed border-indigo-500/20 bg-indigo-500/5 p-6'>
          <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-indigo-600/60 uppercase'>
            <Info className='size-3' /> 附件存档 / DOCUMENTATION
          </Label>
          <FileUploader
            value={formData.fileUrl}
            accept='image/*,.pdf'
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
