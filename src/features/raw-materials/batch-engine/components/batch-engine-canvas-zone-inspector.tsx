import { useMemo } from 'react'
import { useLanguage } from '@/context/language-provider'
import type { StripLayoutZone } from '../services/build-strip-first-layout'
import type {
  BatchOptimizerBreakSliceSummary,
  BatchOptimizerHeatZoneAttribution,
  BatchOptimizerPlan,
  BatchOptimizerZoneClusterSummary,
} from '../types'

type BatchEngineCanvasZoneInspectorProps = {
  zone: StripLayoutZone | null
  viewMode: 'preview' | 'formal'
  selectedPlan?: BatchOptimizerPlan
}

export function BatchEngineCanvasZoneInspector({
  zone,
  viewMode,
  selectedPlan,
}: BatchEngineCanvasZoneInspectorProps) {
  const { t } = useLanguage()

  const zoneAttribution = useMemo<
    BatchOptimizerHeatZoneAttribution | undefined
  >(() => {
    if (!zone || !selectedPlan) {
      return undefined
    }
    return selectedPlan.explainabilitySummary.heatZoneAttributions.find(
      (item) => item.zoneId === zone.id
    )
  }, [selectedPlan, zone])

  const zoneCluster = useMemo<
    BatchOptimizerZoneClusterSummary | undefined
  >(() => {
    if (!zoneAttribution?.clusterId || !selectedPlan) {
      return undefined
    }
    return selectedPlan.explainabilitySummary.zoneClusters.find(
      (item) => item.clusterId === zoneAttribution.clusterId
    )
  }, [selectedPlan, zoneAttribution])

  const zoneBreakSlices = useMemo<BatchOptimizerBreakSliceSummary[]>(() => {
    if (!selectedPlan || !zoneAttribution?.breakSliceIds.length) {
      return []
    }
    return selectedPlan.explainabilitySummary.breakSlices.filter((item) =>
      zoneAttribution.breakSliceIds.includes(item.id)
    )
  }, [selectedPlan, zoneAttribution])

  if (!zone) {
    return (
      <aside className='rounded-[18px] border border-dashed border-slate-300 bg-slate-50/80 p-3'>
        <p className='text-[10px] font-black tracking-[0.2em] text-slate-500/70 uppercase'>
          {t('rawMaterials.batchEngine.canvas.selection')}
        </p>
        <p className='mt-1 text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase'>
          {viewMode === 'formal' ? 'formal plan view' : 'preview view'}
        </p>
        <p className='mt-1.5 text-sm font-semibold text-slate-700'>
          {t('rawMaterials.batchEngine.canvas.hoverHint')}
        </p>
      </aside>
    )
  }

  return (
    <aside className='rounded-[18px] border border-slate-200 bg-white p-3'>
      <p className='text-[10px] font-black tracking-[0.2em] text-slate-500/70 uppercase'>
        {t('rawMaterials.batchEngine.canvas.selection')}
      </p>
      <p className='mt-1 text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase'>
        {viewMode === 'formal' ? 'formal plan view' : 'preview view'}
      </p>
      <p className='mt-1.5 text-base font-black text-slate-900'>{zone.label}</p>
      <p className='mt-1 text-xs font-semibold text-slate-600'>
        {zone.detail || '--'}
      </p>

      <div className='mt-3 grid gap-1.5 text-xs font-semibold text-slate-700'>
        <InspectorRow
          label={t('rawMaterials.batchEngine.canvas.type')}
          value={zone.kind}
        />
        <InspectorRow label='类别' value={zone.usageCategory || '--'} />
        <InspectorRow
          label='差异热区'
          value={zone.isDiffHighlighted ? '是' : '否'}
        />
        <InspectorRow
          label='归因连续段'
          value={
            zoneAttribution
              ? `${zoneAttribution.segmentKind}:${zoneAttribution.segmentKey}`
              : '--'
          }
        />
        <InspectorRow
          label='归因 cluster'
          value={zoneCluster?.clusterId || zoneAttribution?.clusterId || '--'}
        />
        <InspectorRow
          label='归因 slice 数'
          value={String(zoneBreakSlices.length)}
        />
        <InspectorRow label='需求行' value={zone.demandLineId || '--'} />
        <InspectorRow label='卷材' value={zone.rollId || '--'} />
        <InspectorRow
          label='面积'
          value={zone.areaM2 ? `${zone.areaM2.toFixed(3)} m2` : '--'}
        />
        <InspectorRow
          label='覆盖占比'
          value={
            zone.coverageSharePercent
              ? `${zone.coverageSharePercent.toFixed(2)}%`
              : '--'
          }
        />
        <InspectorRow
          label={t('rawMaterials.batchEngine.canvas.position')}
          value={`${zone.x.toFixed(1)} / ${zone.y.toFixed(1)}`}
        />
        <InspectorRow
          label={t('rawMaterials.batchEngine.canvas.size')}
          value={`${zone.width.toFixed(1)} x ${zone.height.toFixed(1)}`}
        />
      </div>

      {zoneAttribution ? (
        <div className='mt-3 rounded-2xl border border-dashed border-violet-300 bg-violet-500/5 p-3'>
          <p className='text-[10px] font-black tracking-[0.18em] text-violet-700 uppercase'>
            Heat Attribution
          </p>
          <div className='mt-2 grid gap-1 text-xs font-semibold text-slate-700'>
            <p>原因: {zoneAttribution.reason || '--'}</p>
            <p>关联需求: {zoneAttribution.demandLineIds.join(', ') || '--'}</p>
            <p>
              Break Slice: {zoneAttribution.breakSliceIds.join(', ') || '--'}
            </p>
          </div>
        </div>
      ) : null}

      {zoneCluster ? (
        <div className='mt-3 rounded-2xl border border-dashed border-amber-300 bg-amber-500/5 p-3'>
          <p className='text-[10px] font-black tracking-[0.18em] text-amber-700 uppercase'>
            Zone Cluster
          </p>
          <div className='mt-2 grid gap-1 text-xs font-semibold text-slate-700'>
            <p>ID: {zoneCluster.clusterId}</p>
            <p>主因: {zoneCluster.dominantReason || '--'}</p>
            <p>主需求: {zoneCluster.dominantDemandLineId || '--'}</p>
            <p>密度: {zoneCluster.densityScore.toFixed(2)}</p>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-1.5'>
      <span className='text-slate-500'>{label}</span>
      <span className='font-black text-slate-800'>{value}</span>
    </div>
  )
}
