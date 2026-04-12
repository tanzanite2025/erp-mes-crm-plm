'use client'

import { useMemo } from 'react'
import { CircleDot, Tag, Info, Save, Grid3X3, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { FileUploader } from '@/components/file-uploader'
import { drillingPlanInputSchema, type DrillingPlan, type DrillingPlanInput } from '../data/schema'
import { LACING_PATTERN_OPTIONS, STANDARD_HOLE_COUNT_OPTIONS } from '../data/drilling-options'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

type DrillingFormState = DrillingPlanInput & { id?: string; createdAt?: string }

interface DrillingActionDialogProps {
  currentRow?: DrillingPlan | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: { 
    data: DrillingPlanInput; 
    isPatch: boolean; 
    delta?: any; 
    version?: number 
  }) => void
  isLoading?: boolean
}

const DEFAULT_DRILLING: DrillingPlanInput = {
  name: '',
  productId: '',
  lacingPattern: '',
  standardHoles: '',
  fileUrl: '',
  fileExtension: 'pdf',
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
  const initialFormData = useMemo<DrillingFormState>(() => {
    if (currentRow) return currentRow
    return { 
      ...DEFAULT_DRILLING
    }
  }, [currentRow, open])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const handleSave = () => {
    const parsed = drillingPlanInputSchema.safeParse(formData)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '请填写钻孔方案必填项')
      return
    }
    const payload = parsed.data

    if (isEdit && currentRow) {
      const delta = tracker.commit()
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }
      onSave({ 
        data: payload, 
        isPatch: true, 
        delta, 
        version: currentRow.version 
      })
    } else {
      onSave({ data: payload, isPatch: false })
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
          {isEdit ? '缂栬緫閽诲瓟鏂规' : '寤虹珛缂栫粐鍑嗗垯'}
        </>
      )}
      description="COMPONENT_MASTER_DRILLING / 瀹氫箟杞湀閽诲瓟鍋忎綅銆佺紪缁囦氦鍙夋ā寮忓強瀛旀暟鏍囧噯銆?"
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
              鍙栨秷 / CANCEL
            </Button>
            <Button 
              disabled={isLoading || (isEdit && !isDirty())}
              onClick={handleSave} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-indigo-600/20 active:scale-95 transition-all gap-2"
            >
              {isLoading ? <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="size-4" />}
              鍚屾瀛樻。 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent pointer-events-none' />

      <div className='grid gap-8 relative'>
        {/* 鏍稿績鏍囪瘑缁?*/}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Tag className='size-3' /> 鏂规鍚嶇О / PLAN_NAME
            </Label>
            <Input
              placeholder='渚嬪: 2X-Cross-Standard-32H'
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-indigo-500/20 px-5 shadow-inner'
              value={formData.name}
              onChange={(e) => { formData.name = e.target.value }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <FileType className='size-3' /> 鍏宠仈鎴愬搧 SKU / PRODUCT_REF
            </Label>
            <SelectDropdown
              defaultValue={formData.productId}
              onValueChange={(val) => { formData.productId = val }}
              items={products.map(p => ({ label: `${p.sku} | ${p.name}`, value: p.id }))}
              placeholder='閫夋嫨閫傞厤鐨勪骇鍝?'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 font-bold text-sm shadow-inner italic'
            />
          </div>
        </div>

        {/* 鎶€鏈鏍肩粍 */}
        <div className='bg-muted/10 p-6 rounded-[32px] border border-dashed border-muted-foreground/10 space-y-6'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 flex items-center gap-2'>
              <Grid3X3 className='size-3' /> 閽诲瓟鎶€鏈弬鏁?/ DRILLING_SPECS
            </p>
            <div className='h-px flex-1 mx-4 bg-muted-foreground/10' />
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>缂栫粐妯″紡 / LACING_PATTERN</Label>
              <SelectDropdown
                defaultValue={formData.lacingPattern}
                onValueChange={(val) => { formData.lacingPattern = val }}
                items={LACING_PATTERN_OPTIONS}
                placeholder='閫夋嫨缂栫粐妯″紡'
                className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm shadow-sm'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>鏍囧噯瀛旀暟 / HOLE_COUNT</Label>
              <SelectDropdown
                defaultValue={formData.standardHoles}
                onValueChange={(val) => { formData.standardHoles = val }}
                items={STANDARD_HOLE_COUNT_OPTIONS}
                placeholder='閫夋嫨瀛旀暟'
                className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm shadow-sm'
              />
            </div>
          </div>
        </div>

        {/* 闄勪欢涓婁紶 */}
        <div className='bg-indigo-500/5 p-6 rounded-[32px] border border-dashed border-indigo-500/20 space-y-3'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-indigo-600/60 flex items-center gap-2'>
            <Info className='size-3' /> 閽诲瓟宸ョ▼鍥剧焊 / ENGINEERING_DWG
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
            <Label className='text-[10px] font-black uppercase tracking-widest'>绯荤粺缂栫爜 / INTERNAL_ID</Label>
            <Input readOnly className='h-10 font-mono text-xs bg-muted/20 border-none rounded-xl px-5' value={formData.id ?? '--'} />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>鏍囧噯鑾峰彇鏃堕棿 / CREATED_AT</Label>
            <Input readOnly className='h-10 font-mono text-xs bg-muted/20 border-none rounded-xl px-5' value={formData.createdAt ?? '--'} />
          </div>
        </div>
      </div>
    </ActionDialogShell>
  )
}
