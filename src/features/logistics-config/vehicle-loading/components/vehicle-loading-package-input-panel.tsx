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
import type { PackagingProfile } from '@/features/logistics-packaging-management/packaging-rules-service'
import type { VehicleLoadingPackageInput } from '../data/vehicle-loading.types'
import { FieldCard } from './field-card'

const labelClass =
  'ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'
const summaryCardClass =
  'rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3'

function renderPackageSummary(packageInput: VehicleLoadingPackageInput | null) {
  if (!packageInput) {
    return (
      <div className='rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground'>
        请选择包装管理中已启用的包装规则后再参与配车计算。
      </div>
    )
  }

  return (
    <div className='grid gap-3 md:grid-cols-4'>
      <div className={summaryCardClass}>
        <div className={labelClass}>箱型名称</div>
        <div className='mt-2 text-sm font-black'>{packageInput.name}</div>
      </div>
      <div className={summaryCardClass}>
        <div className={labelClass}>包装毛重</div>
        <div className='mt-2 text-sm font-black'>
          {packageInput.unitWeightKg.toFixed(3)} kg
        </div>
      </div>
      <div className={`${summaryCardClass} md:col-span-2`}>
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
            可横放 {packageInput.dimension.canInvert ? '是' : '否'}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function renderProfileTarget(profile: PackagingProfile) {
  const target = profile.targets[0]
  if (!target) return '未绑定产品 / 物料'
  return [target.entityName, target.entityCode].filter(Boolean).join(' · ')
}

function renderProfileLabel(profile: PackagingProfile) {
  return [profile.name, profile.code].filter(Boolean).join(' · ')
}

type Props = {
  packageInput: VehicleLoadingPackageInput | null
  packageInputError: Error | null
  packagingProfiles: PackagingProfile[]
  packagingProfilesLoading: boolean
  packagingProfilesError: Error | null
  selectedPackagingProfile: PackagingProfile | null
  selectedPackagingProfileId: string
  onSelectedPackagingProfileIdChange: (profileId: string) => void
}

export function VehicleLoadingPackageInputPanel({
  packageInput,
  packageInputError,
  packagingProfiles,
  packagingProfilesLoading,
  packagingProfilesError,
  selectedPackagingProfile,
  selectedPackagingProfileId,
  onSelectedPackagingProfileIdChange,
}: Props) {
  const hasSelectableProfiles = packagingProfiles.length > 0

  return (
    <FieldCard
      title='包装规则选择'
      description='装载与配车计算只读取包装管理中已维护的箱型尺寸、重量和容量'
    >
      <div className='space-y-4'>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end'>
          <div className='space-y-2'>
            <div className={labelClass}>包装规则</div>
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
                    {renderProfileLabel(profile)}
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

        {!packagingProfilesLoading &&
        !packagingProfilesError &&
        !hasSelectableProfiles ? (
          <div className='rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300'>
            暂无可选包装规则。请先到包装管理维护并启用包装规则；当前页面不会使用默认箱型或手动尺寸生成结果。
          </div>
        ) : null}

        {selectedPackagingProfile ? (
          <div className='grid gap-3 md:grid-cols-3'>
            <div className={summaryCardClass}>
              <div className={labelClass}>关联对象</div>
              <div className='mt-2 text-sm font-black'>
                {renderProfileTarget(selectedPackagingProfile)}
              </div>
            </div>
            <div className={summaryCardClass}>
              <div className={labelClass}>容量</div>
              <div className='mt-2 text-sm font-black'>
                {selectedPackagingProfile.capacity}{' '}
                {selectedPackagingProfile.capacityUnitCode}
              </div>
            </div>
            <div className={summaryCardClass}>
              <div className={labelClass}>包装类型</div>
              <div className='mt-2 text-sm font-black'>
                {selectedPackagingProfile.packagingType || '未填写'}
              </div>
            </div>
          </div>
        ) : null}

        {packageInputError ? (
          <div className='rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-xs leading-relaxed text-destructive'>
            当前包装规则不能参与配车计算：{packageInputError.message}
          </div>
        ) : null}

        {renderPackageSummary(packageInput)}
      </div>
    </FieldCard>
  )
}
