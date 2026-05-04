import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary } from '../types'
import type {
  BatchEngineExplainabilityTarget,
  BatchEngineExplainabilityTargetKind,
  BatchEngineExplainabilityTargetSource,
} from '../services/batch-engine-phase7-visualization'
import {
  resolveExplainabilitySourceLabel,
  resolvePrimaryBreakSlice,
  resolvePrimaryZoneCluster,
  resolveSecondaryBreakSlices,
  resolveSecondaryZoneClusters,
} from '../services/batch-engine-phase7-home-summary-selectors'
import { BatchEnginePhase7ExplainabilityMetaBadge } from './batch-engine-phase7-explainability-meta-badge'

type BatchEnginePhase7HomeSummarySectionProps = {
  selectedPlan?: BatchOptimizerPlan
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
  onOpenExplainabilityTarget: (target: BatchEngineExplainabilityTarget) => void
  selectedExplainabilityTargetId: string
  selectedExplainabilityTargetKind: BatchEngineExplainabilityTargetKind
  selectedExplainabilityTargetSource: BatchEngineExplainabilityTargetSource
}

export function BatchEnginePhase7HomeSummarySection(props: BatchEnginePhase7HomeSummarySectionProps) {
  const {
    selectedPlan,
    activeDiffSummary,
    onOpenExplainabilityTarget,
    selectedExplainabilityTargetId,
    selectedExplainabilityTargetKind,
    selectedExplainabilityTargetSource,
  } = props

  if (!selectedPlan) {
    return null
  }

  const primaryBreakSlice = resolvePrimaryBreakSlice(selectedPlan)
  const primaryZoneCluster = resolvePrimaryZoneCluster(selectedPlan)
  const activeSourceLabel = resolveExplainabilitySourceLabel(selectedExplainabilityTargetSource)
  const isPrimaryBreakSliceActive = selectedExplainabilityTargetKind === 'break-slice' && selectedExplainabilityTargetId === primaryBreakSlice?.id
  const isPrimaryZoneClusterActive = selectedExplainabilityTargetKind === 'zone-cluster' && selectedExplainabilityTargetId === primaryZoneCluster?.clusterId
  const breakSliceQuickActions = resolveSecondaryBreakSlices(selectedPlan, 3).map((item) => ({
    key: item.id,
    label: `${item.segmentKey}`,
    hint: `severity ${item.severityScore.toFixed(2)}`,
    active: selectedExplainabilityTargetKind === 'break-slice' && selectedExplainabilityTargetId === item.id,
    sourceLabel: selectedExplainabilityTargetKind === 'break-slice' && selectedExplainabilityTargetId === item.id ? activeSourceLabel : undefined,
    onClick: () => onOpenExplainabilityTarget({
      targetId: item.id,
      targetKind: 'break-slice',
    }),
  }))
  const zoneClusterQuickActions = resolveSecondaryZoneClusters(selectedPlan, 3).map((item) => ({
    key: item.clusterId,
    label: `${item.clusterId}`,
    hint: `density ${item.densityScore.toFixed(2)}`,
    active: selectedExplainabilityTargetKind === 'zone-cluster' && selectedExplainabilityTargetId === item.clusterId,
    sourceLabel: selectedExplainabilityTargetKind === 'zone-cluster' && selectedExplainabilityTargetId === item.clusterId ? activeSourceLabel : undefined,
    onClick: () => onOpenExplainabilityTarget({
      targetId: item.clusterId,
      targetKind: 'zone-cluster',
    }),
  }))

  return (
    <div className='rounded-[24px] border border-dashed border-border/60 bg-card p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60'>Phase7 首页摘要</p>
          <p className='mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/40'>break slice / zone cluster / dynamic budget</p>
        </div>
        <div className='rounded-full border border-dashed border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary'>
          {selectedPlan.budgetRerankReason || '动态预算稳定'}
        </div>
      </div>

      <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
        <Phase7HeroMetricCard
          label='Break Slice'
          value={`${selectedPlan.explainabilitySummary.breakSlices.length}`}
          tone='violet'
          detail={primaryBreakSlice ? `${primaryBreakSlice.segmentKind}:${primaryBreakSlice.segmentKey} / severity ${primaryBreakSlice.severityScore.toFixed(2)}` : '当前没有可联动 break slice'}
          actionLabel={primaryBreakSlice ? '点击联动预览' : undefined}
          active={isPrimaryBreakSliceActive}
          sourceLabel={isPrimaryBreakSliceActive ? activeSourceLabel : undefined}
          quickActions={breakSliceQuickActions}
          onClick={primaryBreakSlice
            ? () => onOpenExplainabilityTarget({
              targetId: primaryBreakSlice.id,
              targetKind: 'break-slice',
            })
            : undefined}
        />
        <Phase7HeroMetricCard
          label='Zone Cluster'
          value={`${selectedPlan.explainabilitySummary.zoneClusters.length}`}
          tone='amber'
          detail={primaryZoneCluster ? `${primaryZoneCluster.clusterId} / density ${primaryZoneCluster.densityScore.toFixed(2)}` : '当前没有可联动 zone cluster'}
          actionLabel={primaryZoneCluster ? '点击联动预览' : undefined}
          active={isPrimaryZoneClusterActive}
          sourceLabel={isPrimaryZoneClusterActive ? activeSourceLabel : undefined}
          quickActions={zoneClusterQuickActions}
          onClick={primaryZoneCluster
            ? () => onOpenExplainabilityTarget({
              targetId: primaryZoneCluster.clusterId,
              targetKind: 'zone-cluster',
            })
            : undefined}
        />
        <Phase7HeroMetricCard label='动态配额策略' value={`${selectedPlan.candidateBudgetSummary.dynamicStrategyStats.length}`} tone='slate' />
        <Phase7HeroMetricCard label='Cluster 密度峰值' value={`${(selectedPlan.explainabilitySummary.zoneClusters[0]?.densityScore ?? 0).toFixed(2)}`} tone='amber' />
        <Phase7HeroMetricCard label='差异热区' value={`${(activeDiffSummary ?? selectedPlan.diffSummary).highlightZoneIds.length}`} tone='rose' />
      </div>

      <div className='mt-4 grid gap-3 xl:grid-cols-3'>
        <Phase7SummaryBlock
          title='Break Summary'
          content={selectedPlan.explainabilitySummary.primaryBreakReasons.join(' / ') || '连续段稳定'}
          tone='violet'
        />
        <Phase7SummaryBlock
          title='Zone Cluster'
          content={selectedPlan.explainabilitySummary.zoneClusters.slice(0, 2).map((item) => `${item.clusterId} / density ${item.densityScore.toFixed(2)}`).join(' / ') || '热区聚类稳定'}
          tone='amber'
        />
        <Phase7SummaryBlock
          title='Dynamic Budget'
          content={selectedPlan.candidateBudgetSummary.dynamicStrategyStats.slice(0, 2).map((item) => `${item.strategyKey} / quota ${item.targetQuota} / priority ${item.priorityScore.toFixed(2)}`).join(' / ') || '动态预算稳定'}
          tone='slate'
        />
      </div>
    </div>
  )
}

function Phase7HeroMetricCard({
  label,
  value,
  tone,
  detail,
  actionLabel,
  active,
  sourceLabel,
  quickActions,
  onClick,
}: {
  label: string
  value: string
  tone: 'violet' | 'amber' | 'slate' | 'rose'
  detail?: string
  actionLabel?: string
  active?: boolean
  sourceLabel?: string
  quickActions?: Array<{ key: string; label: string; hint: string; active: boolean; sourceLabel?: string; onClick: () => void }>
  onClick?: () => void
}) {
  const className = tone === 'violet'
    ? 'border-violet-500/30 bg-violet-500/10 text-violet-500'
    : tone === 'amber'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
      : tone === 'rose'
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-500'
        : 'border-border/60 bg-muted/10 text-muted-foreground'
  const activeClassName = active ? 'shadow-sm ring-1 ring-current/25' : ''
  const content = (
    <>
      <p className='text-[8px] font-black uppercase tracking-[0.18em] opacity-70'>{label}</p>
      <p className='mt-2 text-sm font-black'>{value}</p>
      {detail ? <p className='mt-2 text-[10px] font-semibold leading-4 opacity-80'>{detail}</p> : null}
      {actionLabel ? <p className='mt-3 text-[9px] font-black uppercase tracking-[0.18em] opacity-75'>{actionLabel}</p> : null}
      {active && sourceLabel ? (
        <div className='mt-2 flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-[0.14em] opacity-80'>
          <span className='opacity-60'>来源</span>
          <BatchEnginePhase7ExplainabilityMetaBadge label={sourceLabel} tone={tone} />
        </div>
      ) : null}
    </>
  )

  return (
    <div className={`rounded-[20px] border border-dashed px-3 py-3 ${className} ${activeClassName}`.trim()}>
      {onClick ? (
        <button
          type='button'
          aria-label={`${label} 联动预览`}
          aria-pressed={active ? 'true' : 'false'}
          onClick={onClick}
          className={`w-full text-left transition hover:-translate-y-0.5 ${active ? 'rounded-[16px] bg-background/40 px-2 py-2' : ''}`.trim()}
        >
          {content}
        </button>
      ) : content}
      {quickActions?.length ? (
        <div className='mt-3 flex flex-wrap gap-2'>
          {quickActions.map((item) => (
            <button
              key={item.key}
              type='button'
              aria-label={`${label} 快捷入口 ${item.label}`}
              aria-pressed={item.active ? 'true' : 'false'}
              onClick={item.onClick}
              className={`rounded-full border border-dashed px-2.5 py-1.5 text-left text-[9px] font-black tracking-[0.14em] transition hover:bg-background/80 ${item.active ? 'border-current/60 bg-background shadow-sm ring-1 ring-current/20' : 'border-current/35 bg-background/50'}`.trim()}
            >
              {item.label}
              <span className='ml-1 opacity-70'>{item.hint}</span>
              {item.active && item.sourceLabel ? <BatchEnginePhase7ExplainabilityMetaBadge label={item.sourceLabel} tone={tone} compact className='ml-2 align-middle' /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Phase7SummaryBlock({
  title,
  content,
  tone,
}: {
  title: string;
  content: string;
  tone: 'violet' | 'amber' | 'slate';
}) {
  const className = tone === 'violet'
    ? 'border-violet-500/30 bg-violet-500/5 text-violet-400'
    : tone === 'amber'
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-400'
      : 'border-border/40 bg-muted/10 text-muted-foreground'
  return (
    <div className={`rounded-[20px] border border-dashed px-3 py-3 ${className}`}>
      <p className='text-[8px] font-black uppercase tracking-[0.18em] opacity-70'>{title}</p>
      <p className='mt-2 text-xs font-semibold leading-5'>{content}</p>
    </div>
  )
}
