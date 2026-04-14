import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ShipmentSummary, VehicleRecommendation } from '../../data/vehicle-loading.types'
import { PlanOverviewFilterTags } from './plan-overview-filter-tags'
import { PlanOverviewInputSourceCard } from './plan-overview-input-source-card'
import { PlanOverviewMetricCard } from './plan-overview-metric-card'
import { PlanOverviewRecommendationCard } from './plan-overview-recommendation-card'
import { PlanOverviewRiskCard } from './plan-overview-risk-card'
import { PlanOverviewSectionCard } from './plan-overview-section-card'
import { PlanOverviewStatusBlock } from './plan-overview-status-block'

type Props = {
  summary: ShipmentSummary
  vehicleSpecsCount: number
  recommendations: VehicleRecommendation[]
  categoryLabelText: string
  activeFilters: Array<{ label: string; value: string }>
  isLoadingSpecs: boolean
  isLoadingRecommendations: boolean
  specsError: Error | null
  recommendationsError: Error | null
  sourceLabel: string
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function getBestRecommendation(recommendations: VehicleRecommendation[]) {
  return recommendations[0]
}

export function VehicleLoadingPlanOverview({
  summary,
  vehicleSpecsCount,
  recommendations,
  categoryLabelText,
  activeFilters,
  isLoadingSpecs,
  isLoadingRecommendations,
  specsError,
  recommendationsError,
  sourceLabel,
}: Props) {
  const best = getBestRecommendation(recommendations)
  const highestLoadRate = recommendations.reduce((max, item) => Math.max(max, item.loadRateWeight, item.loadRateVolume), 0)
  const riskTexts: string[] = []
  if (specsError) riskTexts.push('车型加载失败')
  if (recommendationsError) riskTexts.push('推荐计算失败')
  if (!best) riskTexts.push('暂无可执行方案')

  return (
    <Card className='rounded-[28px] border-dashed shadow-none bg-background/80'>
      <CardHeader className='space-y-2'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <CardTitle className='text-base font-black tracking-tight'>方案总览</CardTitle>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest'>当前筛选条件下的配车概览</CardDescription>
          </div>
          <Badge className='border-none bg-primary/10 text-primary'>{recommendations.length > 0 ? 'READY' : 'NO DATA'}</Badge>
        </div>
      </CardHeader>
      <CardContent className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        <PlanOverviewRecommendationCard
          title='当前最优推荐'
          vehicleName={best ? best.vehicle.name : '暂无推荐'}
          detail={best ? `${best.vehiclesNeeded} 辆 · 体积 ${formatPercent(best.loadRateVolume)} · 重量 ${formatPercent(best.loadRateWeight)}` : '请调整货量或筛选条件后再试算'}
          emptyText='暂无推荐'
        />

        <PlanOverviewRiskCard
          riskText={riskTexts.length > 0 ? riskTexts.join(' · ') : '当前未发现明显风险'}
          detail={recommendations.length > 0 ? `最高利用率 ${formatPercent(highestLoadRate)}，请结合实际线路和装载规则复核。` : '暂无可执行推荐时请调整货量或车型筛选条件。'}
        />

        <PlanOverviewSectionCard className='col-span-2 bg-primary/5 border-primary/20'>
          <div className='text-[10px] font-black uppercase tracking-widest text-primary/70'>当前筛选条件摘要</div>
          <div className='mt-2 text-sm font-black'>{categoryLabelText}</div>
          <PlanOverviewFilterTags activeFilters={activeFilters} />
          <div className='mt-2 text-[11px] leading-relaxed text-primary/80'>
            箱数 {summary.boxes} · 体积 {summary.totalVolumeM3.toFixed(2)} m³ · 重量 {summary.totalWeightKg.toFixed(0)} kg
          </div>
        </PlanOverviewSectionCard>

        <PlanOverviewMetricCard label='车型数' value={vehicleSpecsCount} />
        <PlanOverviewMetricCard label='箱数' value={summary.boxes} />
        <PlanOverviewMetricCard label='推荐数' value={recommendations.length} />
        <PlanOverviewMetricCard label='最高利用率' value={formatPercent(highestLoadRate)} />

        <PlanOverviewStatusBlock
          title='车型加载状态摘要'
          status={isLoadingSpecs ? '车型加载中' : specsError ? '车型加载失败' : '车型已加载'}
          description={specsError ? specsError.message : `${vehicleSpecsCount} 个车型可参与筛选`}
        />

        <PlanOverviewStatusBlock
          title='推荐状态摘要'
          status={isLoadingRecommendations ? '推荐计算中' : recommendationsError ? '推荐计算失败' : '推荐已完成'}
          description={recommendationsError ? recommendationsError.message : `${recommendations.length} 条推荐结果`}
        />

        <PlanOverviewInputSourceCard
          title='输入来源'
          sourceLabel={sourceLabel}
          description='后续可切换为包装规则结果或后端方案。'
        />
      </CardContent>
    </Card>
  )
}
