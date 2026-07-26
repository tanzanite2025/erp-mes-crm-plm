import type { Dispatch, SetStateAction } from 'react'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PackagingProfile } from '@/features/logistics-packaging-management/packaging-rules-service'
import type {
  ShipmentSummary,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'
import { FieldCard } from './field-card'
import {
  renderPackagingProfileLabel,
  renderPackagingProfileTarget,
} from './packaging-profile-display'

const fieldClass =
  'w-full h-11 min-h-11 rounded-2xl border border-border/50 bg-muted/40 px-4 py-0 text-sm font-medium leading-none shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30'
const labelClass =
  'ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'

type Props = {
  summary: ShipmentSummary
  packageInput: VehicleLoadingPackageInput | null
  packageInputError: Error | null
  packagingProfiles: PackagingProfile[]
  packagingProfilesLoading: boolean
  packagingProfilesError: Error | null
  selectedPackagingProfile: PackagingProfile | null
  selectedPackagingProfileId: string
  onSelectedPackagingProfileIdChange: (profileId: string) => void
  onBoxesChange: Dispatch<SetStateAction<number>>
}

export function VehicleLoadingSummaryPanel({
  summary,
  packageInput,
  packageInputError,
  packagingProfiles,
  packagingProfilesLoading,
  packagingProfilesError,
  selectedPackagingProfile,
  selectedPackagingProfileId,
  onSelectedPackagingProfileIdChange,
  onBoxesChange,
}: Props) {
  const hasSelectableProfiles = packagingProfiles.length > 0
  const guidanceMessages: string[] = []
  if (!packagingProfilesLoading && !packagingProfilesError && !hasSelectableProfiles) {
    guidanceMessages.push(
      '暂无可选包装规则，请先到包装管理维护并启用包装规则；当前页面不会使用默认箱型或手动尺寸生成结果。'
    )
  }
  if (summary.boxes === 0) {
    guidanceMessages.push('请选择包装规则后输入箱数，系统会自动换算总体积和总重量。')
  }

  return (
    <FieldCard
      title='装箱汇总'
      description='先选包装规则，再输入箱数，系统自动换算总体积与总重量'
    >
      <div className='space-y-4'>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end'>
          <div className='space-y-2'>
            <Label className={labelClass}>包装规则</Label>
            <Select
              value={selectedPackagingProfileId}
              disabled={packagingProfilesLoading || !hasSelectableProfiles}
              onValueChange={onSelectedPackagingProfileIdChange}
            >
              <SelectTrigger className='h-11 w-full rounded-2xl border-border/50 bg-muted/40 px-4 text-sm font-black shadow-sm shadow-black/5'>
                <SelectValue
                  placeholder={
                    packagingProfilesLoading
                      ? '包装规则加载中...'
                      : '选择包装管理中的包装规则'
                  }
                />
              </SelectTrigger>
              <SelectContent className='z-125 max-h-[360px] min-w-[var(--radix-select-trigger-width)] rounded-2xl'>
                {packagingProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {renderPackagingProfileLabel(profile)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            asChild
            variant='outline'
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
          >
            <a
              href='/logistics-packaging-management/packaging-rules'
              target='_blank'
              rel='noreferrer'
            >
              <ExternalLink className='mr-2 size-4' />
              打开包装管理
            </a>
          </Button>
        </div>

        {packagingProfilesError ? (
          <div className='rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-xs leading-relaxed text-destructive'>
            包装规则加载失败：{packagingProfilesError.message}
          </div>
        ) : null}

        {guidanceMessages.length > 0 ? (
          <div className='rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300'>
            {guidanceMessages.map((item, index) => (
              <div key={item}>
                {index > 0 ? <div className='my-2 h-px bg-amber-500/20' /> : null}
                {item}
              </div>
            ))}
          </div>
        ) : null}

        {selectedPackagingProfile ? (
          <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground'>
            <div className='font-black text-foreground'>
              {renderPackagingProfileLabel(selectedPackagingProfile)}
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              <Badge className='border-none bg-primary/10 text-primary'>
                关联对象 {renderPackagingProfileTarget(selectedPackagingProfile)}
              </Badge>
              <Badge className='border-none bg-primary/10 text-primary'>
                容量 {selectedPackagingProfile.capacity}{' '}
                {selectedPackagingProfile.capacityUnitCode}
              </Badge>
              <Badge className='border-none bg-primary/10 text-primary'>
                类型 {selectedPackagingProfile.packagingType || '未填写'}
              </Badge>
            </div>
          </div>
        ) : null}

        {packageInput ? (
          <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-[11px] leading-relaxed text-primary/80'>
            当前包装规则：{packageInput.name} · 单箱{' '}
            {packageInput.unitWeightKg.toFixed(3)} kg · 尺寸{' '}
            {packageInput.dimension.lengthMm} × {packageInput.dimension.widthMm}{' '}
            × {packageInput.dimension.heightMm} mm · 可旋转{' '}
            {packageInput.dimension.canRotate ? '是' : '否'} · 可横放{' '}
            {packageInput.dimension.canInvert ? '是' : '否'}
          </div>
        ) : null}

        {packageInputError ? (
          <div className='rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-xs leading-relaxed text-destructive'>
            当前包装规则不能参与配车计算：{packageInputError.message}
          </div>
        ) : null}

        <div className='grid gap-3 md:grid-cols-3'>
          <div className='space-y-2'>
            <Label className={labelClass}>箱数</Label>
            <Input
              className={fieldClass}
              inputMode='numeric'
              value={String(summary.boxes)}
              onChange={(event) =>
                onBoxesChange(
                  Number.isFinite(Number(event.target.value))
                    ? Math.max(0, Math.floor(Number(event.target.value)))
                    : 0
                )
              }
            />
          </div>
          <div className='space-y-2'>
            <Label className={labelClass}>总体积</Label>
            <Input
              className={`${fieldClass} bg-background/80`}
              readOnly
              value={`${summary.totalVolumeM3.toFixed(3)} m³`}
            />
          </div>
          <div className='space-y-2'>
            <Label className={labelClass}>总重量</Label>
            <Input
              className={`${fieldClass} bg-background/80`}
              readOnly
              value={`${summary.totalWeightKg.toFixed(3)} kg`}
            />
          </div>
        </div>
      </div>
    </FieldCard>
  )
}
