import { Grid3X3 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { STANDARD_HOLE_COUNT_OPTIONS } from '../data/drilling-options'
import type { DrillingPlanInput } from '../data/schema'

type DrillingSpecSectionProps = {
  formData: DrillingPlanInput & { id?: string; createdAt?: string }
  weavingModeItems: Array<{ label: string; value: string }>
  isWeavingModesLoading: boolean
  isWeavingModesError: boolean
  noWeavingModesAvailable: boolean
  onWeavingModeChange: (value: string) => void
  updateField: <K extends keyof (DrillingPlanInput & { id?: string; createdAt?: string })>(field: K, value: (DrillingPlanInput & { id?: string; createdAt?: string })[K]) => void
}

export function DrillingSpecSection({
  formData,
  weavingModeItems,
  isWeavingModesLoading,
  isWeavingModesError,
  noWeavingModesAvailable,
  onWeavingModeChange,
  updateField,
}: DrillingSpecSectionProps) {
  return (
    <div className='bg-muted/10 p-6 rounded-[32px] border border-dashed border-muted-foreground/10 space-y-6'>
      <div className='flex items-center justify-between'>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 flex items-center gap-2'>
          <Grid3X3 className='size-3' /> 钻孔技术参数 / DRILLING_SPECS
        </p>
        <div className='h-px flex-1 mx-4 bg-muted-foreground/10' />
      </div>

      <div className='grid grid-cols-2 gap-6'>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>编织方式 / WEAVING_MODE</Label>
          <SelectDropdown
            defaultValue={formData.weavingModeId}
            onValueChange={onWeavingModeChange}
            items={weavingModeItems}
            isPending={isWeavingModesLoading}
            disabled={isWeavingModesError || noWeavingModesAvailable}
            placeholder='选择编织方式'
            className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm shadow-sm'
          />
          {isWeavingModesError ? (
            <p className='text-[10px] font-black text-destructive/80'>编织方式主数据加载失败，请稍后重试</p>
          ) : noWeavingModesAvailable ? (
            <p className='text-[10px] font-black text-amber-600/80'>当前没有可用的编织方式，请先到工程主数据中维护</p>
          ) : null}
        </div>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>标准孔数 / HOLE_COUNT</Label>
          <SelectDropdown
            defaultValue={formData.standardHoles}
            onValueChange={(value) => updateField('standardHoles', value)}
            items={STANDARD_HOLE_COUNT_OPTIONS}
            placeholder='选择孔数'
            className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm shadow-sm'
          />
        </div>
      </div>
    </div>
  )
}
