import { FileType, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import type { DrillingPlanInput } from '../data/schema'

type DrillingBasicInfoSectionProps = {
  formData: DrillingPlanInput & { id?: string; createdAt?: string }
  productOptions: Array<{ label: string; value: string }>
  updateField: <
    K extends keyof (DrillingPlanInput & { id?: string; createdAt?: string }),
  >(
    field: K,
    value: (DrillingPlanInput & { id?: string; createdAt?: string })[K]
  ) => void
}

export function DrillingBasicInfoSection({
  formData,
  productOptions,
  updateField,
}: DrillingBasicInfoSectionProps) {
  return (
    <div className='grid grid-cols-2 gap-6'>
      <div className='space-y-2'>
        <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
          <Tag className='size-3' /> 方案名称 / PLAN_NAME
        </Label>
        <Input
          placeholder='例如: 2X-Cross-Standard-32H'
          className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black shadow-inner focus-visible:ring-indigo-500/20'
          value={formData.name}
          onChange={(event) => updateField('name', event.target.value)}
        />
      </div>
      <div className='space-y-2'>
        <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
          <FileType className='size-3' /> 关联成品 SKU / PRODUCT_REF
        </Label>
        <SelectDropdown
          defaultValue={formData.productId}
          onValueChange={(value) => updateField('productId', value)}
          items={productOptions}
          placeholder='选择适配的产品 SKU'
          className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-bold italic shadow-inner'
        />
      </div>
    </div>
  )
}
