import { useMemo } from 'react'
import {
  BadgeInfo,
  Boxes,
  Container,
  Maximize2,
  Ruler,
  Ship,
  Weight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  calculateShippingContainerUsableVolumeRate,
  findLargestPayloadShippingContainerSpec,
  findLargestUsableVolumeShippingContainerSpec,
  SHIPPING_CONTAINER_SPECS,
  type ShippingContainerDimensionsMm,
  type ShippingContainerDoorOpeningMm,
  type ShippingContainerSpec,
} from './container-specs-data'

const SHIPPING_CONTAINER_CATEGORY_BADGE_CLASS: Record<
  ShippingContainerSpec['category'],
  string
> = {
  dry: 'bg-primary/10 text-primary',
  reefer: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  'open-top': 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  'flat-rack': 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
}

function useChineseContainerCopy(locale: string) {
  return locale === 'zh-CN'
}

function formatMillimetersAsMetersText(mm: number) {
  return `${(mm / 1000).toFixed(2)}m`
}

function formatDimensionsText(dimensions: ShippingContainerDimensionsMm) {
  return `${formatMillimetersAsMetersText(
    dimensions.length
  )} × ${formatMillimetersAsMetersText(
    dimensions.width
  )} × ${formatMillimetersAsMetersText(dimensions.height)}`
}

function formatDoorOpeningText(
  doorOpening: ShippingContainerDoorOpeningMm,
  unavailableLabel: string
) {
  if (!doorOpening.width || !doorOpening.height) {
    return unavailableLabel
  }

  return `${formatMillimetersAsMetersText(
    doorOpening.width
  )} × ${formatMillimetersAsMetersText(doorOpening.height)}`
}

function formatVolumeM3(volume: number | null, unavailableLabel: string) {
  if (volume === null) {
    return unavailableLabel
  }

  return `${volume.toFixed(1)}m³`
}

function formatWeightKg(weight: number) {
  return `${weight.toLocaleString()}kg`
}

function getLocalizedContainerName(
  spec: ShippingContainerSpec,
  useChineseCopy: boolean
) {
  return useChineseCopy ? spec.nameZh : spec.nameEn
}

function getLocalizedContainerCategoryName(
  spec: ShippingContainerSpec,
  useChineseCopy: boolean
) {
  return useChineseCopy ? spec.categoryNameZh : spec.categoryNameEn
}

function getLocalizedContainerUseCases(
  spec: ShippingContainerSpec,
  useChineseCopy: boolean
) {
  return useChineseCopy ? spec.typicalUseCasesZh : spec.typicalUseCasesEn
}

function getLocalizedContainerLoadPlanningNotes(
  spec: ShippingContainerSpec,
  useChineseCopy: boolean
) {
  return useChineseCopy ? spec.loadPlanningNotesZh : spec.loadPlanningNotesEn
}

type SummaryCardProps = {
  icon: typeof Container
  label: string
  value: string
  description: string
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: SummaryCardProps) {
  return (
    <Card className='rounded-[24px] border-dashed border-border/60 bg-card p-4 shadow-none'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {label}
          </div>
          <div className='mt-2 text-lg font-black tracking-tight text-foreground'>
            {value}
          </div>
          <div className='mt-1 text-[11px] leading-5 text-muted-foreground'>
            {description}
          </div>
        </div>
        <div className='rounded-2xl border border-dashed border-primary/25 bg-primary/10 p-2 text-primary'>
          <Icon className='size-4' />
        </div>
      </div>
    </Card>
  )
}

type ContainerSpecMetricProps = {
  label: string
  value: string
}

function ContainerSpecMetric({ label, value }: ContainerSpecMetricProps) {
  return (
    <div className='rounded-2xl border border-border/70 bg-background/80 p-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:bg-muted/5'>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
        {label}
      </div>
      <div className='mt-1 text-sm font-black tracking-tight text-foreground'>
        {value}
      </div>
    </div>
  )
}

type ContainerSpecCardProps = {
  spec: ShippingContainerSpec
  useChineseCopy: boolean
  unavailableLabel: string
  labels: {
    internalDimensions: string
    externalDimensions: string
    doorOpening: string
    nominalVolume: string
    usableVolume: string
    maxPayload: string
    tareWeight: string
    maxGrossWeight: string
    useCases: string
    loadPlanningNotes: string
    usableRate: string
  }
}

function ContainerSpecCard({
  spec,
  useChineseCopy,
  unavailableLabel,
  labels,
}: ContainerSpecCardProps) {
  const usableRate = calculateShippingContainerUsableVolumeRate(spec)
  const categoryName = getLocalizedContainerCategoryName(spec, useChineseCopy)

  return (
    <Card className='flex h-full flex-col rounded-[28px] border border-border/80 bg-background p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02] dark:bg-card dark:shadow-[0_16px_36px_rgba(0,0,0,0.22)] dark:ring-white/[0.03]'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-lg font-black tracking-tight text-foreground'>
              {spec.code}
            </span>
            <Badge
              className={cn(
                'h-6 rounded-full border-none px-3 text-[10px] font-black',
                SHIPPING_CONTAINER_CATEGORY_BADGE_CLASS[spec.category]
              )}
            >
              {categoryName}
            </Badge>
          </div>
          <div className='mt-1 text-xs font-black text-muted-foreground'>
            {getLocalizedContainerName(spec, useChineseCopy)}
          </div>
        </div>
        <div className='rounded-full border border-dashed border-border/70 px-3 py-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
          ISO {spec.isoGroupCode}
        </div>
      </div>

      <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2'>
        <ContainerSpecMetric
          label={labels.internalDimensions}
          value={formatDimensionsText(spec.internalDimensionsMm)}
        />
        <ContainerSpecMetric
          label={labels.externalDimensions}
          value={formatDimensionsText(spec.externalDimensionsMm)}
        />
        <ContainerSpecMetric
          label={labels.doorOpening}
          value={formatDoorOpeningText(spec.doorOpeningMm, unavailableLabel)}
        />
        <ContainerSpecMetric
          label={labels.nominalVolume}
          value={formatVolumeM3(spec.nominalVolumeM3, unavailableLabel)}
        />
        <ContainerSpecMetric
          label={labels.usableVolume}
          value={
            usableRate === null
              ? unavailableLabel
              : `${formatVolumeM3(
                  spec.suggestedUsableVolumeM3,
                  unavailableLabel
                )} · ${labels.usableRate} ${usableRate}%`
          }
        />
        <ContainerSpecMetric
          label={labels.maxPayload}
          value={formatWeightKg(spec.maxPayloadKg)}
        />
        <ContainerSpecMetric
          label={labels.tareWeight}
          value={formatWeightKg(spec.tareWeightKg)}
        />
        <ContainerSpecMetric
          label={labels.maxGrossWeight}
          value={formatWeightKg(spec.maxGrossWeightKg)}
        />
      </div>

      <div className='mt-4 grid gap-3 lg:grid-cols-2'>
        <div className='rounded-2xl border border-border/70 bg-background/80 p-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:bg-muted/5'>
          <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {labels.useCases}
          </div>
          <div className='mt-2 flex flex-wrap gap-2'>
            {getLocalizedContainerUseCases(spec, useChineseCopy).map(
              (useCase) => (
                <Badge
                  key={useCase}
                  variant='outline'
                  className='rounded-full border-dashed px-3 text-[10px] font-black'
                >
                  {useCase}
                </Badge>
              )
            )}
          </div>
        </div>
        <div className='rounded-2xl border border-border/70 bg-background/80 p-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:bg-muted/5'>
          <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {labels.loadPlanningNotes}
          </div>
          <div className='mt-2 text-[11px] leading-5 text-muted-foreground'>
            {getLocalizedContainerLoadPlanningNotes(spec, useChineseCopy)}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function LogisticsContainerManagementPage() {
  const { locale, t } = useLanguage()
  const useChineseCopy = useChineseContainerCopy(locale)
  const summary = useMemo(() => {
    const largestUsableVolumeSpec =
      findLargestUsableVolumeShippingContainerSpec(SHIPPING_CONTAINER_SPECS)
    const largestPayloadSpec = findLargestPayloadShippingContainerSpec(
      SHIPPING_CONTAINER_SPECS
    )
    const specialContainerCount = SHIPPING_CONTAINER_SPECS.filter(
      (spec) => spec.category !== 'dry'
    ).length

    return {
      totalCount: SHIPPING_CONTAINER_SPECS.length,
      largestUsableVolumeSpec,
      largestPayloadSpec,
      specialContainerCount,
    }
  }, [])

  const unavailableLabel = t('logisticsContainerManagement.unavailable')

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Container}
        title={t('logisticsContainerManagement.title')}
        description={t('logisticsContainerManagement.description')}
        statusBadge={
          <Badge className='h-6 rounded-full border-none bg-primary/10 px-3 text-[10px] font-black text-primary'>
            {t('logisticsContainerManagement.builtinBadge')}
          </Badge>
        }
      />

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <SummaryCard
          icon={Container}
          label={t('logisticsContainerManagement.summary.total')}
          value={`${summary.totalCount}`}
          description={t('logisticsContainerManagement.summary.totalHint')}
        />
        <SummaryCard
          icon={Maximize2}
          label={t('logisticsContainerManagement.summary.largestVolume')}
          value={
            summary.largestUsableVolumeSpec
              ? `${summary.largestUsableVolumeSpec.code} · ${formatVolumeM3(
                  summary.largestUsableVolumeSpec.suggestedUsableVolumeM3,
                  unavailableLabel
                )}`
              : unavailableLabel
          }
          description={t(
            'logisticsContainerManagement.summary.largestVolumeHint'
          )}
        />
        <SummaryCard
          icon={Weight}
          label={t('logisticsContainerManagement.summary.largestPayload')}
          value={
            summary.largestPayloadSpec
              ? `${summary.largestPayloadSpec.code} · ${formatWeightKg(
                  summary.largestPayloadSpec.maxPayloadKg
                )}`
              : unavailableLabel
          }
          description={t(
            'logisticsContainerManagement.summary.largestPayloadHint'
          )}
        />
        <SummaryCard
          icon={Boxes}
          label={t('logisticsContainerManagement.summary.special')}
          value={`${summary.specialContainerCount}`}
          description={t('logisticsContainerManagement.summary.specialHint')}
        />
      </div>

      <Card className='rounded-[28px] border-dashed border-border/60 bg-muted/5 p-5 shadow-none'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 text-primary'>
              <BadgeInfo className='size-4' />
              <div className='text-[10px] font-black tracking-widest uppercase'>
                {t('logisticsContainerManagement.boundaryTitle')}
              </div>
            </div>
            <div className='mt-2 max-w-3xl text-[11px] leading-5 text-muted-foreground'>
              {t('logisticsContainerManagement.boundaryDescription')}
            </div>
          </div>
          <div className='grid grid-cols-2 gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase sm:grid-cols-3'>
            <div className='flex items-center gap-1.5'>
              <Ruler className='size-3.5 text-primary' />
              mm / m
            </div>
            <div className='flex items-center gap-1.5'>
              <Ship className='size-3.5 text-primary' />
              ISO
            </div>
            <div className='flex items-center gap-1.5'>
              <Weight className='size-3.5 text-primary' />
              kg
            </div>
          </div>
        </div>
      </Card>

      <div className='grid grid-cols-1 gap-4 2xl:grid-cols-2'>
        {SHIPPING_CONTAINER_SPECS.map((spec) => (
          <ContainerSpecCard
            key={spec.id}
            spec={spec}
            useChineseCopy={useChineseCopy}
            unavailableLabel={unavailableLabel}
            labels={{
              internalDimensions: t(
                'logisticsContainerManagement.metrics.internalDimensions'
              ),
              externalDimensions: t(
                'logisticsContainerManagement.metrics.externalDimensions'
              ),
              doorOpening: t(
                'logisticsContainerManagement.metrics.doorOpening'
              ),
              nominalVolume: t(
                'logisticsContainerManagement.metrics.nominalVolume'
              ),
              usableVolume: t(
                'logisticsContainerManagement.metrics.usableVolume'
              ),
              maxPayload: t('logisticsContainerManagement.metrics.maxPayload'),
              tareWeight: t('logisticsContainerManagement.metrics.tareWeight'),
              maxGrossWeight: t(
                'logisticsContainerManagement.metrics.maxGrossWeight'
              ),
              useCases: t('logisticsContainerManagement.metrics.useCases'),
              loadPlanningNotes: t(
                'logisticsContainerManagement.metrics.loadPlanningNotes'
              ),
              usableRate: t('logisticsContainerManagement.metrics.usableRate'),
            }}
          />
        ))}
      </div>
    </div>
  )
}
