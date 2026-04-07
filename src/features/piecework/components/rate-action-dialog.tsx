'use client'

import { useMemo } from 'react'
import { Landmark, Save, Tag, Box, Info, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import type { DeltaSet } from '@/lib/delta/types'
import { toast } from 'sonner'
import { PieceworkRate } from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { SelectDropdown } from '@/components/select-dropdown'

interface RateActionDialogProps {
  currentRow?: PieceworkRate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: { 
    data: PieceworkRate; 
    isPatch: boolean; 
    delta?: DeltaSet; 
    version?: number 
  }) => void
  isLoading?: boolean
}

const DEFAULT_RATE: Partial<PieceworkRate> = {
  productId: '',
  processName: '',
  piecePrice: 0,
  unit: 'PCS',
  status: 'active',
  remarks: '',
  version: 1,
}

export function RateActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: RateActionDialogProps) {
  const { data: products = [] } = useGetProducts()

  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[600px] rounded-[32px] overflow-hidden',
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
      ...DEFAULT_RATE, 
      id: `R-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    } as PieceworkRate
  }, [currentRow, open])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const handleSave = () => {
    // Fail Loudly: 必须检查必要字段
    if (!formData.productId || !formData.processName || formData.piecePrice === undefined) {
      toast.error('[CRITICAL] 缺失必要参数: 关联产品、工序或单价')
      return
    }

    if (isEdit && currentRow) {
      const delta = tracker.commit()
      // 如果没有变化且处于编辑模式，直接关闭
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
          <div className='p-2 bg-emerald-500/10 rounded-xl'>
            <Landmark className='size-5 text-emerald-500' />
          </div>
          {isEdit ? '编辑计件工价规则' : '定义新计件标准'}
        </>
      )}
      description="PIECEWORK_RATE_ENGINE / 设定工序级原子工价，所有变更将进入 SDRTS 审计流水。"
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <p className='text-[10px] text-muted-foreground flex items-center gap-2 font-black uppercase tracking-widest opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse' />
            SDRTS_Active_Tracking
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-emerald-600/20 active:scale-95 transition-all gap-2"
            >
              {isLoading ? <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="size-4" />}
              同步标准 / SYNC_RATE
            </Button>
          </div>
        </>
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent pointer-events-none' />

      <div className='grid gap-8 relative'>
        {/* 产品关联 */}
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
            <Box className='size-3' /> 关联产品 SKU / TARGET_PRODUCT
          </Label>
          <SelectDropdown
            defaultValue={formData.productId}
            onValueChange={(val) => { formData.productId = val }}
            items={products.map(p => ({ label: `${p.sku} | ${p.name}`, value: p.id }))}
            placeholder='选择适配的产品 SKU'
            className='h-12 rounded-2xl border-none bg-muted/40 px-4 font-bold text-sm shadow-inner italic'
          />
        </div>

        {/* 工序与单价组 */}
        <div className='grid grid-cols-2 gap-6 p-6 rounded-[32px] bg-muted/20 border border-dashed border-muted-foreground/10'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2'>
              <Target className='size-3' /> 工序名称 / PROCESS
            </Label>
            <Input
              placeholder='例如: 编条 / 冲孔'
              className='h-12 font-black text-sm bg-background border-none rounded-2xl px-5 shadow-sm'
              value={formData.processName}
              onChange={(e) => { formData.processName = e.target.value }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2'>
              <Tag className='size-3' /> 计件单价 / UNIT_PRICE
            </Label>
            <Input
              type='number'
              step='0.01'
              placeholder='0.00'
              className='h-12 font-mono font-black text-sm bg-background border-none rounded-2xl px-5 shadow-sm'
              value={formData.piecePrice}
              onChange={(e) => { formData.piecePrice = parseFloat(e.target.value) || 0 }}
            />
          </div>
        </div>

        {/* 状态与单位 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>结算单位 / UNIT</Label>
            <Input
              placeholder='PCS / KG'
              className='h-11 font-bold text-xs bg-muted/40 border-none rounded-2xl px-5'
              value={formData.unit}
              onChange={(e) => { formData.unit = e.target.value }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>规则状态 / STATUS</Label>
            <SelectDropdown
              defaultValue={formData.status}
              onValueChange={(val) => { formData.status = val as 'active' | 'inactive' }}
              items={[
                { label: '生效中 / ACTIVE', value: 'active' },
                { label: '已失效 / INACTIVE', value: 'inactive' },
              ]}
              className='h-11 rounded-2xl border-none bg-muted/40 px-4 font-bold text-xs shadow-inner'
            />
          </div>
        </div>

        {/* 备注 */}
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2'>
            <Info className='size-3' /> 核算备注 / AUDIT_NOTE
          </Label>
          <Input
            placeholder='输入此工价标准的特殊说明...'
            className='h-11 font-medium text-xs bg-muted/40 border-none rounded-2xl px-5'
            value={formData.remarks || ''}
            onChange={(e) => { formData.remarks = e.target.value }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
