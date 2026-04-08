'use client'

import { useCallback, useMemo } from 'react'
import { Box, Hash, Tag, Info, Save, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUploader } from '@/components/file-uploader'
import type { DeltaSet } from '@/lib/delta/types'
import type { Hub } from '../data/hub-schema'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

type HubFormState = Hub
type HubFormUpdater = HubFormState | ((prev: HubFormState) => HubFormState)

interface HubActionDialogProps {
  currentRow?: Hub | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: { 
    data: Hub; 
    isPatch: boolean; 
    delta?: DeltaSet; 
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
    title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer: 'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const isEdit = !!currentRow
  const initialFormData = useMemo(() => {
    if (currentRow) return currentRow
    return { 
      ...DEFAULT_HUB, 
      // [BACKEND-AUTHORITY]: 物理 ID 严禁在前端使用 Math.random 生成，必须由后端数据库在创建时分配。
      id: '',
      createdAt: new Date().toISOString() 
    } as Hub
  }, [currentRow])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const setFormData = useCallback((updater: HubFormUpdater) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      Object.assign(formData, next)
    } else {
      Object.assign(formData, updater)
    }
  }, [formData])

  const updateField = useCallback(<K extends keyof Hub>(field: K, value: Hub[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [setFormData])

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
        version: currentRow.version 
      })
    } else {
      onSave({ data: formData, isPatch: false })
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={(
        <>
          <div className='p-2 bg-indigo-500/10 rounded-xl'>
            <Box className='size-5 text-indigo-500' />
          </div>
          {isEdit ? '编辑花鼓参数' : '建立花鼓基准'}
        </>
      )}
      description="COMPONENT_MASTER_HUB / 定义花鼓核心几何特征，确保辐条长度计算精度。"
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <p className='text-[10px] text-muted-foreground flex items-center gap-2 font-black uppercase tracking-widest opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-indigo-500 animate-pulse' />
            Sync_to_Geometry_Engine
          </p>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="font-black text-[10px] uppercase tracking-widest rounded-full px-6"
            >
              取消 / CANCEL
            </Button>
            <Button 
              disabled={isLoading || (isEdit && !isDirty())}
              onClick={handleSave} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-indigo-600/20 active:scale-95 transition-all gap-2"
            >
              {isLoading ? <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="size-4" />}
              同步存档 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent pointer-events-none' />

      <div className='grid gap-8 relative'>
        {/* 核心标识组 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Tag className='size-3' /> 花鼓名称 / HUB_NAME
            </Label>
            <Input
              placeholder='例如: SHIMANO-M8100'
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-indigo-500/20 px-5 shadow-inner'
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Hash className='size-3' /> 系统编码 / INTERNAL_ID
            </Label>
            <Input
              readOnly
              className='h-12 font-mono font-bold text-xs bg-muted/20 border-none rounded-2xl px-5 opacity-60 cursor-not-allowed'
              value={formData.id}
            />
          </div>
        </div>

        {/* 品牌与型号 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>品牌 / BRAND</Label>
            <Input
              placeholder='输入品牌名称'
              className='h-12 font-bold text-sm bg-muted/40 border-none rounded-2xl px-5 shadow-inner'
              value={formData.brand}
              onChange={(e) => updateField('brand', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>型号 / MODEL</Label>
            <Input
              placeholder='输入型号编码'
              className='h-12 font-bold text-sm bg-muted/40 border-none rounded-2xl px-5 shadow-inner'
              value={formData.model}
              onChange={(e) => updateField('model', e.target.value)}
            />
          </div>
        </div>

        {/* 核心几何数值 */}
        <div className='bg-muted/10 p-6 rounded-[32px] border border-dashed border-muted-foreground/10 space-y-6'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 flex items-center gap-2'>
              <Cpu className='size-3' /> 几何计算参数 / GEOMETRY_PROPERTIES
            </p>
            <div className='h-px flex-1 mx-4 bg-muted-foreground/10' />
            <span className='text-[8px] font-mono text-muted-foreground'>(UNIT: MM)</span>
          </div>

          <div className='grid grid-cols-2 lg:grid-cols-5 gap-4'>
            <div className='space-y-2'>
              <Label className='text-[9px] font-bold opacity-60'>孔数 / HOLES</Label>
              <Input className='h-10 rounded-xl bg-background border-none shadow-sm font-mono' value={formData.holeCount} onChange={(e) => updateField('holeCount', e.target.value)} />
            </div>
            <div className='space-y-2 text-indigo-600'>
              <Label className='text-[9px] font-bold'>PCD_LEFT</Label>
              <Input className='h-10 rounded-xl bg-background border-none shadow-sm font-mono' value={formData.pcdLeft} onChange={(e) => updateField('pcdLeft', e.target.value)} />
            </div>
            <div className='space-y-2 text-indigo-600'>
              <Label className='text-[9px] font-bold'>PCD_RIGHT</Label>
              <Input className='h-10 rounded-xl bg-background border-none shadow-sm font-mono' value={formData.pcdRight} onChange={(e) => updateField('pcdRight', e.target.value)} />
            </div>
            <div className='space-y-2 text-amber-600'>
              <Label className='text-[9px] font-bold'>FL_LEFT</Label>
              <Input className='h-10 rounded-xl bg-background border-none shadow-sm font-mono' value={formData.flangeLeft} onChange={(e) => updateField('flangeLeft', e.target.value)} />
            </div>
            <div className='space-y-2 text-amber-600'>
              <Label className='text-[9px] font-bold'>FL_RIGHT</Label>
              <Input className='h-10 rounded-xl bg-background border-none shadow-sm font-mono' value={formData.flangeRight} onChange={(e) => updateField('flangeRight', e.target.value)} />
            </div>
          </div>
        </div>

        {/* 附件上传 */}
        <div className='bg-indigo-500/5 p-6 rounded-[32px] border border-dashed border-indigo-500/20 space-y-3'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-indigo-600/60 flex items-center gap-2'>
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
