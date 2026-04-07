'use client'

import { useMemo, useState, useEffect } from 'react'
import { Ruler, Tag, Info, Save, Box, Nut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { FileUploader } from '@/components/file-uploader'
import { SpokeLength } from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { hubService } from '../services/hub-service'
import { nippleService } from '../services/nipple-service'
import { type Hub } from '../data/hub-schema'
import { type Nipple } from '../data/nipple-schema'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

interface SpokeLengthActionDialogProps {
  currentRow?: SpokeLength | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: { 
    data: SpokeLength; 
    isPatch: boolean; 
    delta?: any; 
    version?: number 
  }) => void
  isLoading?: boolean
}

const DEFAULT_SPOKE_LENGTH: Partial<SpokeLength> = {
  name: '',
  productId: '',
  hubId: '',
  nippleId: '',
  length: '',
  material: '',
  fileUrl: '',
  fileExtension: '',
  version: 1,
}

export function SpokeLengthActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: SpokeLengthActionDialogProps) {
  const { data: products = [] } = useGetProducts()
  const [hubs, setHubs] = useState<Hub[]>([])
  const [nipples, setNipples] = useState<Nipple[]>([])

  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[700px] rounded-[32px] overflow-hidden',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer: 'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  // 加载关联数据
  useEffect(() => {
    if (open) {
      const loadMasterData = async () => {
        const [hubData, nippleData] = await Promise.all([
          hubService.getHubs(),
          nippleService.getNipples()
        ])
        setHubs(hubData)
        setNipples(nippleData)
      }
      loadMasterData()
    }
  }, [open])

  const isEdit = !!currentRow
  const initialFormData = useMemo(() => {
    if (currentRow) return currentRow
    return { 
      ...DEFAULT_SPOKE_LENGTH, 
      id: `SL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      createdAt: new Date().toISOString() 
    } as SpokeLength
  }, [currentRow, open])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const handleSave = () => {
    if (!formData.name || !formData.productId) {
      toast.error('请填写必要参数（名称、关联产品）')
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
          <div className='p-2 bg-blue-500/10 rounded-xl'>
            <Ruler className='size-5 text-blue-500' />
          </div>
          {isEdit ? '编辑辐条成品定义' : '建立辐条成品基准'}
        </>
      )}
      description="COMPONENT_MASTER_SPOKE / 定义辐条成品的几何物理特征，支持多部件联动适配。"
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <p className='text-[10px] text-muted-foreground flex items-center gap-2 font-black uppercase tracking-widest opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-blue-500 animate-pulse' />
            Sync_to_BOM_Hierarchy
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-blue-600/20 active:scale-95 transition-all gap-2"
            >
              {isLoading ? <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="size-4" />}
              同步存档 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent pointer-events-none' />

      <div className='grid gap-8 relative'>
        {/* 核心标识组 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Tag className='size-3' /> 配套名称 / DISPLAY_NAME
            </Label>
            <Input
              placeholder='例如: DT-SWISS-29er-Rear'
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-blue-500/20 px-5 shadow-inner'
              value={formData.name}
              onChange={(e) => { formData.name = e.target.value }}
            />
          </div>
          <div className='space-y-2 text-blue-600'>
            <Label className='text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-2'>
              <Box className='size-3' /> 关联成品 SKU / PARENT_PRODUCT
            </Label>
            <SelectDropdown
              defaultValue={formData.productId}
              onValueChange={(val) => { formData.productId = val }}
              items={products.map(p => ({ label: `${p.sku} | ${p.name}`, value: p.id }))}
              placeholder='选择适配的产品 SKU'
              className='h-12 rounded-2xl border-none bg-blue-500/5 px-4 font-bold text-sm shadow-inner italic'
            />
          </div>
        </div>

        {/* 核心参数组 */}
        <div className='grid grid-cols-2 gap-6 p-6 rounded-[32px] bg-muted/20 border border-dashed border-muted-foreground/10'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>辐条长度 / SPOKE_LENGTH (MM)</Label>
            <Input
              placeholder='例如: 298'
              className='h-12 font-mono font-black text-sm bg-background border-none rounded-2xl px-5 shadow-sm'
              value={formData.length}
              onChange={(e) => { formData.length = e.target.value }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>组件材质 / MATERIAL</Label>
            <Input
              placeholder='例如: SUS304 / Steel'
              className='h-12 font-bold text-sm bg-background border-none rounded-2xl px-5 shadow-sm'
              value={formData.material}
              onChange={(e) => { formData.material = e.target.value }}
            />
          </div>
        </div>

        {/* 结构联动组 */}
        <div className='bg-muted/10 p-6 rounded-[32px] border border-dashed border-muted-foreground/10 space-y-6'>
          <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2'>LINKED_COMPONENTS / 结构关联件</p>
          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-2'>
                <Box className='size-3 text-indigo-500' /> 适配花鼓 / HUB_REF
              </Label>
              <SelectDropdown
                defaultValue={formData.hubId}
                onValueChange={(val) => { formData.hubId = val }}
                items={hubs.map(h => ({ label: `${h.brand} ${h.name}`, value: h.id }))}
                placeholder='选择关联花鼓'
                className='h-11 rounded-2xl border-none bg-background px-4 font-bold text-xs shadow-sm shadow-inner'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-2'>
                <Nut className='size-3 text-orange-500' /> 适配条帽 / NIPPLE_REF
              </Label>
              <SelectDropdown
                defaultValue={formData.nippleId}
                onValueChange={(val) => { formData.nippleId = val }}
                items={nipples.map(n => ({ label: `${n.brand} ${n.name}`, value: n.id }))}
                placeholder='选择关联条帽'
                className='h-11 rounded-2xl border-none bg-background px-4 font-bold text-xs shadow-sm shadow-inner'
              />
            </div>
          </div>
        </div>

        {/* 附件与归档 */}
        <div className='bg-blue-500/5 p-6 rounded-[32px] border border-dashed border-blue-500/20 space-y-3'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-blue-600/60 flex items-center gap-2'>
            <Info className='size-3' /> 技术文档 / TECHNICAL_ATTACHMENT
          </Label>
          <FileUploader 
            value={formData.fileUrl} 
            accept='image/*,.pdf'
            onChange={(url, ext) => {
              formData.fileUrl = url
              if (ext) formData.fileExtension = ext
            }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
