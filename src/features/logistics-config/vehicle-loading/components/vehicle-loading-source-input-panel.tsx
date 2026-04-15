import { type Dispatch, type SetStateAction } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { PackagingProfile } from '@/features/logistics-config/packaging-rules-service'
import type {
  VehicleLoadingApiPackageDraft,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'
import type { VehicleLoadingSourceType } from '../data/vehicle-loading-sources'
import { FieldCard } from './field-card'

const inputClass =
  'w-full h-11 min-h-11 rounded-2xl border border-border/50 bg-muted/40 px-4 py-0 text-sm font-medium leading-none shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30'
const labelClass = 'ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'

function renderPackageSummary(packageInput: VehicleLoadingPackageInput | null) {
  if (!packageInput) {
    return <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground'>当前来源输入尚未就绪。</div>
  }

  return (
    <div className='grid gap-3 md:grid-cols-4'>
      <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3'>
        <div className={labelClass}>箱型名称</div>
        <div className='mt-2 text-sm font-black'>{packageInput.name}</div>
      </div>
      <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3'>
        <div className={labelClass}>单箱重量</div>
        <div className='mt-2 text-sm font-black'>{packageInput.unitWeightKg.toFixed(3)} kg</div>
      </div>
      <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 md:col-span-2'>
        <div className={labelClass}>箱型尺寸</div>
        <div className='mt-2 flex flex-wrap items-center gap-2 text-sm font-black'>
          <span>{packageInput.dimension.lengthMm} × {packageInput.dimension.widthMm} × {packageInput.dimension.heightMm} mm</span>
          <Badge className='border-none bg-primary/10 text-primary'>可旋转 {packageInput.dimension.canRotate ? '是' : '否'}</Badge>
          <Badge className='border-none bg-primary/10 text-primary'>可倒置 {packageInput.dimension.canInvert ? '是' : '否'}</Badge>
        </div>
      </div>
    </div>
  )
}

type Props = {
  source: VehicleLoadingSourceType
  packageInput: VehicleLoadingPackageInput | null
  packageInputError: Error | null
  isLoadingPackageInput: boolean
  packagingProfiles: PackagingProfile[]
  selectedPackagingProfileId: string
  onSelectedPackagingProfileIdChange: (value: string) => void
  apiPackageDraft: VehicleLoadingApiPackageDraft
  onApiPackageDraftChange: Dispatch<SetStateAction<VehicleLoadingApiPackageDraft>>
}

export function VehicleLoadingSourceInputPanel({
  source,
  packageInput,
  packageInputError,
  isLoadingPackageInput,
  packagingProfiles,
  selectedPackagingProfileId,
  onSelectedPackagingProfileIdChange,
  apiPackageDraft,
  onApiPackageDraftChange,
}: Props) {
  return (
    <FieldCard title='来源输入' description='当前推荐计算实际使用的箱型输入'>
      <div className='space-y-4'>
        {source === 'packing-rule' ? (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <div className={labelClass}>包装定义</div>
              <Select value={selectedPackagingProfileId} onValueChange={onSelectedPackagingProfileIdChange}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder='请选择一个包装定义' />
                </SelectTrigger>
                <SelectContent>
                  {packagingProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLoadingPackageInput ? (
              <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground'>正在加载包装定义...</div>
            ) : null}
          </div>
        ) : null}

        {source === 'api' ? (
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2 md:col-span-2'>
              <div className={labelClass}>箱型名称</div>
              <Input
                className={inputClass}
                value={apiPackageDraft.name}
                onChange={(event) => onApiPackageDraftChange((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <div className={labelClass}>单箱重量 kg</div>
              <Input
                className={inputClass}
                inputMode='decimal'
                value={apiPackageDraft.unitWeightKg}
                onChange={(event) => onApiPackageDraftChange((prev) => ({ ...prev, unitWeightKg: event.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <div className={labelClass}>长度 mm</div>
              <Input
                className={inputClass}
                inputMode='decimal'
                value={apiPackageDraft.lengthMm}
                onChange={(event) => onApiPackageDraftChange((prev) => ({ ...prev, lengthMm: event.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <div className={labelClass}>宽度 mm</div>
              <Input
                className={inputClass}
                inputMode='decimal'
                value={apiPackageDraft.widthMm}
                onChange={(event) => onApiPackageDraftChange((prev) => ({ ...prev, widthMm: event.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <div className={labelClass}>高度 mm</div>
              <Input
                className={inputClass}
                inputMode='decimal'
                value={apiPackageDraft.heightMm}
                onChange={(event) => onApiPackageDraftChange((prev) => ({ ...prev, heightMm: event.target.value }))}
              />
            </div>
            <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <div className={labelClass}>允许旋转</div>
                  <div className='mt-2 text-xs text-muted-foreground'>只允许底面旋转，长宽可互换，保持高度方向不变</div>
                </div>
                <Switch
                  checked={apiPackageDraft.canRotate}
                  onCheckedChange={(checked) =>
                    onApiPackageDraftChange((prev) => ({
                      ...prev,
                      canRotate: checked,
                      canInvert: checked ? prev.canInvert : false,
                    }))
                  }
                />
              </div>
            </div>
            <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <div className={labelClass}>允许倒置</div>
                  <div className='mt-2 text-xs text-muted-foreground'>允许改变竖直方向，将箱体侧放或翻面参与计算</div>
                </div>
                <Switch
                  checked={apiPackageDraft.canInvert}
                  disabled={!apiPackageDraft.canRotate}
                  onCheckedChange={(checked) => onApiPackageDraftChange((prev) => ({ ...prev, canInvert: checked }))}
                />
              </div>
            </div>
          </div>
        ) : null}

        {packageInputError ? (
          <div className='rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-xs leading-relaxed text-destructive'>
            {packageInputError.message}
          </div>
        ) : null}

        {renderPackageSummary(packageInput)}
      </div>
    </FieldCard>
  )
}
