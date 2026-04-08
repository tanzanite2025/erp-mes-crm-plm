'use client'

import { useMemo } from 'react'
import { CircleDot, Hash, Tag, Info, Save, Grid3X3, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { FileUploader } from '@/components/file-uploader'
import { type DrillingPlan } from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

interface DrillingActionDialogProps {
  currentRow?: DrillingPlan | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: { 
    data: DrillingPlan; 
    isPatch: boolean; 
    delta?: any; 
    version?: number 
  }) => void
  isLoading?: boolean
}

const DEFAULT_DRILLING: Partial<DrillingPlan> = {
  name: '',
  productId: '',
  lacingPattern: '',
  standardHoles: '',
  fileUrl: '',
  fileExtension: 'pdf',
  version: 1,
}

export function DrillingActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: DrillingActionDialogProps) {
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
      ...DEFAULT_DRILLING, 
      id: `DRL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      createdAt: new Date().toISOString() 
    } as DrillingPlan
  }, [currentRow, open])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const handleSave = () => {
    if (!formData.name || !formData.productId) {
      toast.error('请填写规范名称与关联产品')
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
            <CircleDot className='size-5 text-indigo-500' />
          </div>
          {isEdit ? '编辑钻孔方案' : '建立编织准则'}
        </>
      )}
      description="COMPONENT_MASTER_DRILLING / 定义轮圈钻孔偏位、编织交叉模式及孔数标准。"
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
            Sync_to_Manufacturing_Module
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
              <Tag className='size-3' /> 方案名称 / PLAN_NAME
            </Label>
            <Input
              placeholder='例如: 2X-Cross-Standard-32H'
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-indigo-500/20 px-5 shadow-inner'
              value={formData.name}
              onChange={(e) => { formData.name = e.target.value }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <FileType className='size-3' /> 关联成品 SKU / PRODUCT_REF
            </Label>
            <SelectDropdown
              defaultValue={formData.productId}
              onValueChange={(val) => { formData.productId = val }}
              items={products.map(p => ({ label: `${p.sku} | ${p.name}`, value: p.id }))}
              placeholder='选择适配的产品'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 font-bold text-sm shadow-inner italic'
            />
          </div>
        </div>

        {/* 技术规格组 */}
        <div className='bg-muted/10 p-6 rounded-[32px] border border-dashed border-muted-foreground/10 space-y-6'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 flex items-center gap-2'>
              <Grid3X3 className='size-3' /> 钻孔技术参数 / DRILLING_SPECS
            </p>
            <div className='h-px flex-1 mx-4 bg-muted-foreground/10' />
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>编织模式 / LACING_PATTERN</Label>
              <SelectDropdown
                defaultValue={formData.lacingPattern}
                onValueChange={(val) => { formData.lacingPattern = val }}
                items={DictionaryCoreService.getOptions('LACING_PATTERN')}
                placeholder='选择编织模式'
                className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm shadow-sm'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>标准孔数 / HOLE_COUNT</Label>
              <SelectDropdown
                defaultValue={formData.standardHoles}
                onValueChange={(val) => { formData.standardHoles = val }}
                items={DictionaryCoreService.getOptions('HOLE_COUNT')}
                placeholder='选择孔数'
                className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm shadow-sm'
              />
            </div>
          </div>
        </div>

        {/* 附件上传 */}
        <div className='bg-indigo-500/5 p-6 rounded-[32px] border border-dashed border-indigo-500/20 space-y-3'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-indigo-600/60 flex items-center gap-2'>
            <Info className='size-3' /> 钻孔工程图纸 / ENGINEERING_DWG
          </Label>
          <FileUploader 
            value={formData.fileUrl} 
            accept='.pdf,.dwg,.dxf,.stp,.step'
            onChange={(url, ext) => {
              formData.fileUrl = url
              if (ext) formData.fileExtension = ext
            }}
          />
        </div>

        <div className='grid grid-cols-2 gap-6 opacity-40 grayscale pointer-events-none'>
           <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>系统编码 / INTERNAL_ID</Label>
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
