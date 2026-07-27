import {
  formatVehicleModelTemplateSourceLabel,
  formatVehicleModelTemplateStatusLabel,
} from '../../vehicle-model-templates'
import type {
  VehicleLoadingPreviewLayer,
  VehicleLoadingPreviewScene,
} from '../data/vehicle-loading-preview-scene.types'
import { buildVehicleLoadingCandidateComparisonRows } from '../services/vehicle-loading-candidate-comparison'
import type { VehicleLoadingLayerLayout } from '../services/vehicle-loading-layer-layout'
import { OrientationLegend } from './orientation-legend'

type Props = {
  scene: VehicleLoadingPreviewScene
  activeLayer?: VehicleLoadingPreviewLayer
  activeLayerIndex: number
  layerCount: number
  zoomPercent: number
  activeLayerLayout: VehicleLoadingLayerLayout
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function formatSignedInteger(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

function formatComparisonKindLabel(kind: string) {
  switch (kind) {
    case 'manual-reference':
      return '人工'
    case 'cad-reference':
      return 'UG/NX'
    default:
      return ''
  }
}

function formatCollisionWitnessLabel(witness: {
  kind: string
  anchorMm: { xMm: number; yMm: number; zMm: number }
  otherId?: string
}) {
  const target =
    witness.kind === 'blockedSpace' || witness.kind === 'blockedSpaceObb'
      ? `障碍区 ${witness.otherId ?? '未知'}`
      : `箱体 ${witness.otherId ?? '未知'}`
  return `${target} · 锚点 (${witness.anchorMm.xMm}, ${witness.anchorMm.yMm}, ${witness.anchorMm.zMm}) mm`
}

export function VehicleLoadingPreviewDetailsPanel({
  scene,
  activeLayer,
  activeLayerIndex,
  layerCount,
  zoomPercent,
  activeLayerLayout,
}: Props) {
  if (scene.status === 'empty') {
    return (
      <div className='h-full min-h-0 space-y-2 overflow-y-auto rounded-[20px] border border-dashed border-border/60 bg-muted/[0.03] p-3'>
        <div>
          <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            说明
          </div>
          <div className='mt-2 text-sm font-black'>尚未生成推荐方案</div>
          <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
            先在页面下方完成包装规则、箱数和车型条件后，再打开这里查看装箱预览。
          </div>
        </div>

        <div className='rounded-2xl border border-dashed border-border/60 bg-background/80 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground'>
          当前弹窗只是预览入口，不会写入真实发货。
        </div>

        <div className='space-y-2'>
          {scene.explanation.map((item) => (
            <div
              key={item}
              className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-primary/80'
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (scene.status === 'calculating') {
    return (
      <div className='h-full min-h-0 space-y-2 overflow-y-auto rounded-[20px] border border-dashed border-primary/30 bg-primary/[0.03] p-3'>
        <div className='text-[10px] font-black tracking-widest text-primary/60 uppercase'>
          WASM
        </div>
        <div className='text-sm font-black text-primary'>装箱计算中</div>
        <div className='text-[11px] leading-relaxed text-primary/75'>
          当前正在生成真实摆放坐标。计算完成前不会展示旧示意图，避免把未完成结果误认为成功结果。
        </div>
      </div>
    )
  }

  if (scene.status === 'failed') {
    return (
      <div className='h-full min-h-0 space-y-2 overflow-y-auto rounded-[20px] border border-dashed border-destructive/40 bg-destructive/[0.03] p-3'>
        <div className='text-[10px] font-black tracking-widest text-destructive/70 uppercase'>
          WASM
        </div>
        <div className='text-sm font-black text-destructive'>装箱计算失败</div>
        <div className='rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive/80'>
          {scene.errorMessage ?? '未知错误'}
        </div>
        {scene.diagnostics ? (
          <div className='rounded-2xl border border-dashed border-border/60 bg-background/80 px-3 py-2'>
            <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              朝向诊断
            </div>
            <div className='mt-2 space-y-1.5'>
              {scene.diagnostics.orientations.map((orientation) => (
                <div
                  key={`${orientation.orientationLabel}:${orientation.yawDegrees}`}
                  className='rounded-xl border border-dashed border-border/60 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-black text-foreground'>
                      {orientation.orientationLabel} · yaw{' '}
                      {orientation.yawDegrees}°
                    </span>
                    <span>{orientation.reasonCode}</span>
                  </div>
                  <div className='mt-0.5'>{orientation.reasonMessage}</div>
                  <div className='mt-0.5'>
                    几何容量 {orientation.maxBoxesByGeometry} · 载重容量{' '}
                    {orientation.maxBoxesByWeight} · 候选锚点{' '}
                    {orientation.candidateAnchorCount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const activeLayerName =
    activeLayer?.displayName ?? `第 ${activeLayerIndex + 1} 层`
  const activeLayerBoxes =
    activeLayer?.boxesInLayer ?? scene.placement.boxesPerLayer
  const isUsingRegisteredTemplate =
    scene.modelTemplateSource === 'registered-template'
  const candidateSummaries = scene.search?.candidateSummaries ?? []
  const candidateComparisonRows = buildVehicleLoadingCandidateComparisonRows({
    candidateSummaries,
    referenceSummaries: scene.referenceComparisons,
    selectedOrientationLabel: scene.placement.orientation.label,
    selectedScanStrategy: scene.search?.selectedScanStrategy,
    selectedMaxBoxesPerUnit: scene.placement.maxBoxes,
  })

  return (
    <div className='h-full min-h-0 space-y-2 overflow-y-auto rounded-[20px] border border-dashed border-border/60 bg-muted/[0.03] p-3'>
      {scene.modelTemplate ? (
        <div className='rounded-2xl border border-dashed border-border/60 bg-background/80 px-3 py-2'>
          <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {isUsingRegisteredTemplate ? '模型模板' : '种子车型'}
          </div>
          <div className='mt-1 flex flex-wrap items-center gap-2'>
            <div className='text-sm font-black text-foreground'>
              {scene.modelTemplate.name}
            </div>
            <div className='rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary'>
              {scene.modelTemplate.seedVehicleName}
            </div>
            <div className='rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-600'>
              {formatVehicleModelTemplateSourceLabel(
                scene.modelTemplate.sourceFormat
              )}
            </div>
            <div className='rounded-full bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground'>
              {formatVehicleModelTemplateStatusLabel(
                scene.modelTemplate.status
              )}
            </div>
            <div
              className={[
                'rounded-full px-2 py-1 text-[10px] font-black',
                isUsingRegisteredTemplate
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
              ].join(' ')}
            >
              {isUsingRegisteredTemplate ? '已命中注册模板' : '未注册模板回退'}
            </div>
          </div>
          <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
            {isUsingRegisteredTemplate
              ? `当前预览已绑定注册表模板：${scene.modelTemplate.sourceAssetName ?? scene.modelTemplate.name}。真实 3D 解析器未接入前，示意尺寸仍使用车型规格库。`
              : '当前车型还没有注册模型模板，预览使用车型规格库中的种子尺寸。'}
          </div>
        </div>
      ) : null}

      <div className='rounded-2xl border border-dashed border-border/60 bg-background/80 px-3 py-2'>
        <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          装箱说明
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-2'>
          <div className='text-sm font-black'>{scene.vehicle.name}</div>
          <div className='rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary'>
            {scene.placement.orientation.label}
          </div>
        </div>
      </div>

      {candidateSummaries.length > 0 ? (
        <div className='rounded-2xl border border-dashed border-border/60 bg-background/80 px-3 py-2'>
          <div className='flex items-center justify-between gap-2'>
            <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              候选方案
            </div>
            <div className='rounded-full bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground'>
              {candidateSummaries.length} 个
            </div>
          </div>
          <div className='mt-2 grid gap-1.5'>
            {candidateComparisonRows.slice(0, 6).map((candidate) => {
              const isSelected = candidate.kind === 'algorithm-selected'
              const comparisonKindLabel = formatComparisonKindLabel(
                candidate.kind
              )
              return (
                <div
                  key={candidate.id}
                  className={[
                    'rounded-xl border border-dashed px-2 py-1.5',
                    isSelected
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-primary/15 bg-primary/[0.03]',
                  ].join(' ')}
                >
                  <div className='flex flex-wrap items-center justify-between gap-1.5'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <div className='text-[11px] font-black text-foreground'>
                        {candidate.label} · yaw {candidate.yawDegrees}°
                      </div>
                      {isSelected ? (
                        <div className='rounded-full bg-primary px-2 py-0.5 text-[9px] font-black text-primary-foreground'>
                          选中
                        </div>
                      ) : null}
                      {!isSelected && comparisonKindLabel ? (
                        <div className='rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground'>
                          {comparisonKindLabel}
                        </div>
                      ) : null}
                    </div>
                    <div className='text-[11px] font-black text-primary'>
                      {candidate.maxBoxesPerUnit} 箱/单元
                    </div>
                  </div>
                  <div className='mt-1 flex flex-wrap gap-1.5 text-[10px] font-black text-muted-foreground/80'>
                    <span>
                      差异 {formatSignedInteger(candidate.boxDelta)} 箱
                    </span>
                    <span>体积 {formatRate(candidate.volumeRate)}</span>
                    <span>重量 {formatRate(candidate.weightRate)}</span>
                    {candidate.blockedPositions !== undefined ? (
                      <span>过滤 {candidate.blockedPositions}</span>
                    ) : null}
                  </div>
                  {candidate.scanStrategy ? (
                    <div className='mt-1 truncate text-[10px] text-muted-foreground/70'>
                      {candidate.scanStrategy}
                    </div>
                  ) : null}
                  {isSelected && candidate.rejectionSummary ? (
                    <div className='mt-1 space-y-0.5 text-[10px] leading-relaxed text-muted-foreground/75'>
                      <div>
                        锚点验算{' '}
                        {candidate.rejectionSummary.evaluatedAnchorCount}{' '}
                        个，接受{' '}
                        {candidate.rejectionSummary.acceptedAnchorCount}{' '}
                        个；边界{' '}
                        {candidate.rejectionSummary.boundaryRejectionCount}，
                        障碍{' '}
                        {candidate.rejectionSummary.blockedSpaceRejectionCount}
                        ， 互撞{' '}
                        {candidate.rejectionSummary.collisionRejectionCount}，
                        支撑 {candidate.rejectionSummary.supportRejectionCount}
                      </div>
                      {candidate.rejectionSummary.firstCollisionWitness ? (
                        <div className='truncate text-muted-foreground/60'>
                          首个碰撞：
                          {formatCollisionWitnessLabel(
                            candidate.rejectionSummary.firstCollisionWitness
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className='grid grid-cols-3 gap-1.5'>
        <div className='rounded-xl border border-dashed border-primary/20 bg-primary/5 px-2 py-2'>
          <div className='text-[9px] font-black tracking-widest text-primary/60 uppercase'>
            当前层
          </div>
          <div className='mt-1 text-xs font-black text-primary'>
            {activeLayerName}
          </div>
        </div>
        <div className='rounded-xl border border-dashed border-primary/20 bg-primary/5 px-2 py-2'>
          <div className='text-[9px] font-black tracking-widest text-primary/60 uppercase'>
            箱数
          </div>
          <div className='mt-1 text-xs font-black text-primary'>
            {activeLayerBoxes} 箱
          </div>
        </div>
        <div className='rounded-xl border border-dashed border-primary/20 bg-primary/5 px-2 py-2'>
          <div className='text-[9px] font-black tracking-widest text-primary/60 uppercase'>
            缩放
          </div>
          <div className='mt-1 text-xs font-black text-primary'>
            {zoomPercent}%
          </div>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-1.5 text-[10px] font-black text-muted-foreground/80'>
        <div className='rounded-xl border border-dashed border-border/60 bg-background/80 px-2 py-1.5'>
          脚印利用率 {(activeLayerLayout.occupancyRate * 100).toFixed(1)}%
        </div>
        <div className='rounded-xl border border-dashed border-border/60 bg-background/80 px-2 py-1.5'>
          已占 {activeLayerLayout.occupiedSlots} /{' '}
          {activeLayerLayout.totalSlots}
        </div>
        <div className='rounded-xl border border-dashed border-border/60 bg-background/80 px-2 py-1.5'>
          真实比例 {activeLayerLayout.usesRealDimensions ? '是' : '否'}
        </div>
      </div>

      <OrientationLegend compact className='gap-1.5' />

      <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2'>
        <div className='text-[10px] font-black tracking-widest text-primary/60 uppercase'>
          计算说明
        </div>
        <div className='mt-1 space-y-1 text-[11px] leading-relaxed text-primary/80'>
          {scene.explanation.map((item) => (
            <div key={item}>· {item}</div>
          ))}
        </div>
      </div>

      <div className='rounded-2xl border border-dashed border-border/60 bg-background/80 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground'>
        当前共 {Math.max(layerCount, 1)} 层，正在查看第 {activeLayerIndex + 1}{' '}
        层。图中仅展示当前装箱方案的示意关系，后续 3D
        旋转预览会接到这里，不改变当前业务数据。
      </div>
    </div>
  )
}
