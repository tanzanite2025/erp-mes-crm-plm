import { FileType, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import type { DrillingPlanInput } from '../data/schema'

type DrillingBasicInfoSectionProps = {
  formData: DrillingPlanInput & { id?: string; createdAt?: string }
  products: Array<{ id: string; sku: string; name: string }>
  updateField: <K extends keyof (DrillingPlanInput & { id?: string; createdAt?: string })>(field: K, value: (DrillingPlanInput & { id?: string; createdAt?: string })[K]) => void
}

export function DrillingBasicInfoSection({
  formData,
  products,
  updateField,
}: DrillingBasicInfoSectionProps) {
  return (
    <div className='grid grid-cols-2 gap-6'>
      <div className='space-y-2'>
        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
          <Tag className='size-3' /> 方案名称 / PLAN_NAME
        </Label>
        <Input
          placeholder='例如: 2X-Cross-Standard-32H'
          className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-indigo-500/20 px-5 shadow-inner'
          value={formData.name}
          onChange={(event) => updateField('name', event.target.value)}
        />
      </div>
      <div className='space-y-2'>
        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
          <FileType className='size-3' /> 关联成品 SKU / PRODUCT_REF
        </Label>
        <SelectDropdown
          defaultValue={formData.productId}
          onValueChange={(value) => updateField('productId', value)}
          items={products.map((product) => ({ label: `${product.sku} | ${product.name}`, value: product.id }))}
          placeholder='选择适配的产品 SKU'
          className='h-12 rounded-2xl border-none bg-muted/40 px-5 font-bold text-sm shadow-inner italic'
        />
      </div>
    </div>
  )
}
