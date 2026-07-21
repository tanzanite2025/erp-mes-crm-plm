import { type Dispatch, type SetStateAction } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type {
  VehicleLoadingPackageDraft,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'
import { FieldCard } from './field-card'

const inputClass =
  'w-full h-11 min-h-11 rounded-2xl border border-border/50 bg-muted/40 px-4 py-0 text-sm font-medium leading-none shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30'
const labelClass =
  'ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'

function renderPackageSummary(packageInput: VehicleLoadingPackageInput | null) {
  if (!packageInput) {
    return (
      <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground'>
        当前箱型输入尚未就绪，请检查单箱重量和尺寸是否大于 0。
      </div>
    )
  }

  return (
    <div className='grid gap-3 md:grid-cols-4'>
      <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3'>
        <div className={labelClass}>箱型名称</div>
        <div className='mt-2 text-sm font-black'>{packageInput.name}</div>
      </div>
      <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3'>
        <div className={labelClass}>单箱重量</div>
        <div className='mt-2 text-sm font-black'>
          {packageInput.unitWeightKg.toFixed(3)} kg
        </div>
      </div>
      <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 md:col-span-2'>
        <div className={labelClass}>箱型尺寸</div>
        <div className='mt-2 flex flex-wrap items-center gap-2 text-sm font-black'>
          <span>
            {packageInput.dimension.lengthMm} × {packageInput.dimension.widthMm}{' '}
            × {packageInput.dimension.heightMm} mm
          </span>
          <Badge className='border-none bg-primary/10 text-primary'>
            可旋转 {packageInput.dimension.canRotate ? '是' : '否'}
          </Badge>
          <Badge className='border-none bg-primary/10 text-primary'>
            可倒置 {packageInput.dimension.canInvert ? '是' : '否'}
          </Badge>
        </div>
      </div>
    </div>
  )
}

type Props = {
  packageInput: VehicleLoadingPackageInput | null
  packageInputError: Error | null
  packageDraft: VehicleLoadingPackageDraft
  onPackageDraftChange: Dispatch<SetStateAction<VehicleLoadingPackageDraft>>
}

export function VehicleLoadingPackageInputPanel({
  packageInput,
  packageInputError,
  packageDraft,
  onPackageDraftChange,
}: Props) {
  return (
    <FieldCard
      title='箱型输入'
      description='后端装载建议实际使用的箱型尺寸和朝向约束'
    >
      <div className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2 md:col-span-2'>
            <div className={labelClass}>箱型名称</div>
            <Input
              className={inputClass}
              value={packageDraft.name}
              onChange={(event) =>
                onPackageDraftChange((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <div className={labelClass}>长度 mm</div>
            <Input
              className={inputClass}
              inputMode='decimal'
              value={packageDraft.lengthMm}
              onChange={(event) =>
                onPackageDraftChange((prev) => ({
                  ...prev,
                  lengthMm: event.target.value,
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <div className={labelClass}>宽度 mm</div>
            <Input
              className={inputClass}
              inputMode='decimal'
              value={packageDraft.widthMm}
              onChange={(event) =>
                onPackageDraftChange((prev) => ({
                  ...prev,
                  widthMm: event.target.value,
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <div className={labelClass}>高度 mm</div>
            <Input
              className={inputClass}
              inputMode='decimal'
              value={packageDraft.heightMm}
              onChange={(event) =>
                onPackageDraftChange((prev) => ({
                  ...prev,
                  heightMm: event.target.value,
                }))
              }
            />
          </div>
          <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-[11px] leading-relaxed text-primary/80'>
            单箱重量由出货汇总中的总毛重和箱数自动换算，避免同一批货量出现两套重量口径。
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className={labelClass}>允许旋转</div>
                <div className='mt-2 text-xs text-muted-foreground'>
                  长宽可互换，保持高度方向不变
                </div>
              </div>
              <Switch
                checked={packageDraft.canRotate}
                onCheckedChange={(checked) =>
                  onPackageDraftChange((prev) => ({
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
                <div className='mt-2 text-xs text-muted-foreground'>
                  允许改变竖直方向，将箱体侧放或翻面参与计算
                </div>
              </div>
              <Switch
                checked={packageDraft.canInvert}
                disabled={!packageDraft.canRotate}
                onCheckedChange={(checked) =>
                  onPackageDraftChange((prev) => ({
                    ...prev,
                    canInvert: checked,
                  }))
                }
              />
            </div>
          </div>
        </div>

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
