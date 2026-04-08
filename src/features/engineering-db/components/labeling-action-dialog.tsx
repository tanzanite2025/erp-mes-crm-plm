'use client'

import { useMemo } from 'react'
import { Sticker, Hash, Tag, Save, Layers, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { FileUploader } from '@/components/file-uploader'
import { type LabelingDraft } from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

interface LabelingActionDialogProps {
  currentRow?: LabelingDraft | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: { 
    data: LabelingDraft; 
    isPatch: boolean; 
    delta?: any; 
    version?: number 
  }) => void
  isLoading?: boolean
}

const DEFAULT_LABELING: Partial<LabelingDraft> = {
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
  const initialFormData = useMemo(() => {
    if (currentRow) return currentRow
    return { 
      ...DEFAULT_LABELING, 
      // [BACKEND-AUTHORITY]: 物理 ID 严禁在前端使用 Math.random 生成，必须由后端数据库在创建时分配。
      id: '',
      createdAt: new Date().toISOString() 
    } as LabelingDraft
  }, [currentRow, open])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const handleSave = () => {
    if (!formData.name || !formData.fileUrl) {
      toast.error('请上传设计稿并填写方案名称')
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
          <div className='p-2 bg-teal-500/10 rounded-xl'>
            <Sticker className='size-5 text-teal-600' />
          </div>
          {isEdit ? '编辑贴标设计' : '发布视觉方案'}
        </>
      )}
      description="DESIGN_MASTER_LABELING / 管理水标、涂装、激光镭雕等外观设计稿及成品适配关系。"
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <p className='text-[10px] text-muted-foreground flex items-center gap-2 font-black uppercase tracking-widest opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-teal-500 animate-pulse' />
            Sync_to_Visual_Identity
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
              className="bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-teal-600/20 active:scale-95 transition-all gap-2"
            >
              {isLoading ? <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="size-4" />}
              同步存档 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-teal-500/5 via-transparent pointer-events-none' />

      <div className='grid gap-8 relative'>
        {/* 设计稿预览与上传区 */}
        <div className='bg-teal-500/5 p-6 rounded-[32px] border border-dashed border-teal-500/20 space-y-4'>
           <div className='flex items-center justify-between'>
            <p className='text-[10px] font-black uppercase tracking-widest text-teal-600/70 flex items-center gap-2'>
              <Layers className='size-3' /> 设计稿原始文件 / DESIGN_ASSET
            </p>
          </div>
          <FileUploader 
            value={formData.fileUrl} 
            accept='image/*,.pdf,.ai,.eps'
            onChange={(url, ext) => {
              formData.fileUrl = url
              if (ext) formData.fileExtension = ext
            }}
          />
        </div>

        {/* 核心标识组 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Tag className='size-3' /> 方案名称 / SCHEME_NAME
            </Label>
            <Input
              placeholder='例如: DT-SWISS-2025-V1-Water'
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-teal-500/20 px-5 shadow-inner'
              value={formData.name}
              onChange={(e) => { formData.name = e.target.value }}
            />
          </div>
           <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Layers className='size-3' /> 工艺类型 / TECH_TYPE
            </Label>
            <SelectDropdown
              defaultValue={formData.type}
              onValueChange={(val) => { formData.type = val as any }}
              items={[
                { label: '水际贴标 / WATER_DECAL', value: 'Water' },
                { label: '涂装喷漆 / PAINTING', value: 'Paint' },
                { label: '激光镭雕 / LASER_ENGRAVING', value: 'Laser' },
                { label: '其他工艺 / OTHERS', value: 'Other' },
              ]}
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 font-bold text-sm shadow-inner italic'
            />
          </div>
        </div>

        {/* 适配关系组 */}
        <div className='bg-muted/10 p-6 rounded-[32px] border border-dashed border-muted-foreground/10 space-y-4'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Package className='size-3' /> 适配成品 / TARGET_PRODUCT (SKU)
            </Label>
            <SelectDropdown
              defaultValue={formData.productId || 'generic'}
              onValueChange={(val) => { formData.productId = val === 'generic' ? '' : val }}
              items={[
                { label: '-- 通用视觉方案 / GENERIC_SCHEME --', value: 'generic' },
                ...products.map(p => ({ label: `${p.sku} | ${p.name}`, value: p.id }))
              ]}
              placeholder='选择适配的产品'
              className='h-12 rounded-2xl border-none bg-background px-5 font-bold text-sm shadow-sm italic'
            />
          </div>
        </div>

         {/* 系统元数据 (只读区) */}
        <div className='grid grid-cols-2 gap-6 opacity-40 grayscale pointer-events-none'>
           <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>设计编码 / ASSET_UID</Label>
            <Input readOnly className='h-10 font-mono text-xs bg-muted/20 border-none rounded-xl px-5' value={formData.id} />
          </div>
          <div className='space-y-2'>
             <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Hash className='size-3' /> 数据版本 / DATA_VERSION
            </Label>
            <Input readOnly className='h-10 font-mono text-xs bg-muted/20 border-none rounded-xl px-5' value={`REV.${formData.version ?? 1}`} />
          </div>
        </div>
      </div>
    </ActionDialogShell>
  )
}
