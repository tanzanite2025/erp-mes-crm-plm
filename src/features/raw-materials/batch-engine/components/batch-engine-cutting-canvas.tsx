import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import type { BatchEngineControls, BatchEngineSimulation, BatchOptimizerPlan, BatchOptimizerPlanDiffSummary } from '../types'
import {
  buildStripFirstLayout,
  type StripLayoutZone,
} from '../services/build-strip-first-layout'
import {
  clampScale,
  createFitViewport,
  drawStripFirstLayout,
  hitTestZone,
  screenToWorld,
  type BatchCanvasViewport,
} from '../services/draw-strip-first-layout'

type BatchEngineCuttingCanvasProps = {
  controls: BatchEngineControls
  simulation: BatchEngineSimulation
  selectedPlan?: BatchOptimizerPlan
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
  highlightedDemandLineId?: string
  filteredRollIds?: string[]
  onSelectDemandLine?: (demandLineId: string) => void
}

type CanvasSize = {
  width: number
  height: number
}

type TooltipPosition = {
  x: number
  y: number
}

const EMPTY_SIZE: CanvasSize = { width: 0, height: 0 }
const MIN_PAN_DISTANCE = 3

export function BatchEngineCuttingCanvas(props: BatchEngineCuttingCanvasProps) {
  const { t } = useLanguage()
  const { controls, simulation, selectedPlan, activeDiffSummary, highlightedDemandLineId, filteredRollIds, onSelectDemandLine } = props
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originOffsetX: number
    originOffsetY: number
    moved: boolean
  } | null>(null)

  const [size, setSize] = useState<CanvasSize>(EMPTY_SIZE)
  const [viewport, setViewport] = useState<BatchCanvasViewport>({
    scale: 0.04,
    offsetX: 24,
    offsetY: 24,
  })
  const [hoveredZoneId, setHoveredZoneId] = useState<string>('')
  const [selectedZoneId, setSelectedZoneId] = useState<string>('')
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ x: 24, y: 24 })
  const viewMode = selectedPlan ? 'formal' : 'preview'

  const layout = useMemo(
    () => buildCanvasLayout(controls, simulation, selectedPlan, activeDiffSummary),
    [activeDiffSummary, controls, selectedPlan, simulation]
  )

  const hoveredZone = useMemo(
    () => layout.zones.find((zone) => zone.id === hoveredZoneId) || null,
    [layout.zones, hoveredZoneId]
  )
  const selectedZone = useMemo(
    () => layout.zones.find((zone) => zone.id === selectedZoneId) || null,
    [layout.zones, selectedZoneId]
  )
  const activeZone = selectedZone || hoveredZone

  useEffect(() => {
    const element = wrapperRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const target = entries[0]
      if (!target) return
      const nextWidth = Math.max(Math.floor(target.contentRect.width), 0)
      const nextHeight = Math.max(Math.floor(target.contentRect.height), 0)
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      )
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return

    const nextViewport = createFitViewport(layout, size.width, size.height)
    const frame = window.requestAnimationFrame(() => {
      setViewport(nextViewport)
      setHoveredZoneId('')
      setSelectedZoneId('')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [layout, size.height, size.width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width <= 0 || size.height <= 0) return

    const ratio = window.devicePixelRatio || 1
    const pixelWidth = Math.max(Math.floor(size.width * ratio), 1)
    const pixelHeight = Math.max(Math.floor(size.height * ratio), 1)

    if (canvas.width !== pixelWidth) canvas.width = pixelWidth
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`

    const context = canvas.getContext('2d')
    if (!context) return

    drawStripFirstLayout({
      context,
      cssWidth: size.width,
      cssHeight: size.height,
      dpr: ratio,
      layout,
      viewport,
      hoveredZoneId,
      selectedZoneId,
      highlightedDemandLineId,
      filteredRollIds,
    })
  }, [filteredRollIds, highlightedDemandLineId, hoveredZoneId, layout, selectedZoneId, size.height, size.width, viewport])

  const resetViewport = () => {
    if (size.width <= 0 || size.height <= 0) return
    setViewport(createFitViewport(layout, size.width, size.height))
  }

  const zoomAtPoint = (pointX: number, pointY: number, factor: number) => {
    setViewport((current) => {
      const world = screenToWorld(current, pointX, pointY)
      const nextScale = clampScale(current.scale * factor)
      return {
        scale: nextScale,
        offsetX: pointX - world.x * nextScale,
        offsetY: pointY - world.y * nextScale,
      }
    })
  }

  const updateHoverZone = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const next = hitTestZone(layout, viewport, event.clientX - rect.left, event.clientY - rect.top)
    setHoveredZoneId(next?.id || '')
    setTooltipPosition({
      x: event.clientX - rect.left + 16,
      y: event.clientY - rect.top + 16,
    })
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: viewport.offsetX,
      originOffsetY: viewport.offsetY,
      moved: false,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const dragState = dragRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      updateHoverZone(event)
      return
    }

    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY
    if (Math.abs(deltaX) >= MIN_PAN_DISTANCE || Math.abs(deltaY) >= MIN_PAN_DISTANCE) {
      dragState.moved = true
    }

    setViewport((current) => ({
      ...current,
      offsetX: dragState.originOffsetX + deltaX,
      offsetY: dragState.originOffsetY + deltaY,
    }))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const dragState = dragRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    if (!dragState.moved) {
      const rect = event.currentTarget.getBoundingClientRect()
      const hitZone = hitTestZone(layout, viewport, event.clientX - rect.left, event.clientY - rect.top)
      setSelectedZoneId(hitZone?.id || '')
      setHoveredZoneId(hitZone?.id || '')
      if (hitZone?.demandLineId) {
        onSelectDemandLine?.(hitZone.demandLineId)
      }
    }

    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handlePointerLeave = () => {
    if (!dragRef.current) {
      setHoveredZoneId('')
    }
  }

  return (
    <div className='grid h-full min-h-0 gap-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
          <span className='rounded-full border border-slate-300 bg-white px-3 py-1'>
            视图: {viewMode === 'formal' ? '正式方案' : '本地预览'}
          </span>
          <span className='rounded-full border border-slate-300 bg-white px-3 py-1'>
            {t('rawMaterials.batchEngine.canvas.scale')}: {(viewport.scale * 100).toFixed(1)}%
          </span>
          <span className='rounded-full border border-slate-300 bg-white px-3 py-1'>
            {t('rawMaterials.batchEngine.canvas.zones')}: {layout.zones.length}
          </span>
          {highlightedDemandLineId ? (
            <span className='rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-700'>
              高亮需求: {highlightedDemandLineId}
            </span>
          ) : null}
          {filteredRollIds?.length ? (
            <span className='rounded-full border border-slate-300 bg-white px-3 py-1'>卷材过滤: {filteredRollIds.length}</span>
          ) : null}
          {activeDiffSummary?.highlightZoneIds.length ? (
            <span className='rounded-full border border-rose-200 bg-rose-500/10 px-3 py-1 text-rose-700'>
              差异热区: {activeDiffSummary.highlightZoneIds.length}
            </span>
          ) : null}
        </div>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8 rounded-full'
            onClick={() => zoomAtPoint(size.width / 2, size.height / 2, 1.15)}
          >
            <ZoomIn className='size-4' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8 rounded-full'
            onClick={() => zoomAtPoint(size.width / 2, size.height / 2, 1 / 1.15)}
          >
            <ZoomOut className='size-4' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8 rounded-full'
            onClick={resetViewport}
          >
            <RotateCcw className='size-4' />
          </Button>
        </div>
      </div>

      <div className='grid min-h-0 gap-2 xl:grid-cols-[minmax(0,1fr)_300px]'>
        <div
          ref={wrapperRef}
          className='relative min-h-[320px] overflow-hidden rounded-[18px] border border-dashed border-slate-300/70 bg-slate-950/95'
        >
          <canvas
            ref={canvasRef}
            className='block h-full w-full cursor-grab touch-none active:cursor-grabbing'
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          />
          {hoveredZone?.tooltipLines?.length ? (
            <div
              className='pointer-events-none absolute z-10 w-[240px] rounded-[20px] border border-dashed border-slate-300 bg-white/95 p-3 shadow-2xl'
              style={{
                left: Math.min(tooltipPosition.x, Math.max(size.width - 260, 12)),
                top: Math.min(tooltipPosition.y, Math.max(size.height - 180, 12)),
              }}
            >
              <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>区域 Tooltip</p>
              <p className='mt-1 text-sm font-black text-slate-900'>{hoveredZone.label}</p>
              <div className='mt-2 grid gap-1 text-xs font-semibold text-slate-700'>
                {hoveredZone.tooltipLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <ZoneInspector zone={activeZone} viewMode={viewMode} />
      </div>
    </div>
  )
}

function buildCanvasLayout(
  controls: BatchEngineControls,
  simulation: BatchEngineSimulation,
  selectedPlan?: BatchOptimizerPlan,
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
) {
  if (!selectedPlan) {
    return buildStripFirstLayout(controls, simulation)
  }

  const widthMm = Math.max(selectedPlan.layoutSummary.canvasWidthMm, 1)
  const heightMm = Math.max(selectedPlan.layoutSummary.canvasHeightMm, 1)
  const diffZoneIdSet = new Set(activeDiffSummary?.highlightZoneIds ?? [])
  const zones: StripLayoutZone[] = selectedPlan.layoutSummary.zones.map((zone) => ({
    id: zone.id,
    kind: toCanvasZoneKind(zone.kind),
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    label: zone.label,
    detail: zone.detail || '--',
    usageCategory: zone.usageCategory,
    rollId: zone.rollId,
    demandLineId: zone.demandLineId,
    areaM2: zone.areaM2,
    allocatedSets: zone.allocatedSets,
    allocatedPieces: zone.allocatedPieces,
    coverageSharePercent: zone.coverageSharePercent,
    tooltipLines: diffZoneIdSet.has(zone.id) ? [...zone.tooltipLines, `差异热区: 当前方案与 Top${activeDiffSummary?.baselinePlanRank ?? 1} 基准存在布局差异`] : zone.tooltipLines,
    isDiffHighlighted: diffZoneIdSet.has(zone.id),
    interactive: true,
  }))

  return {
    widthMm,
    heightMm,
    zones,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: widthMm,
      maxY: heightMm,
    },
  }
}

function toCanvasZoneKind(kind: string): StripLayoutZone['kind'] {
  if (kind === 'roll' || kind === 'loss' || kind === 'strip' || kind === 'piece' || kind === 'aggregate') {
    return kind
  }
  return 'aggregate'
}

function ZoneInspector({ zone, viewMode }: { zone: StripLayoutZone | null; viewMode: 'preview' | 'formal' }) {
  const { t } = useLanguage()

  if (!zone) {
    return (
      <aside className='rounded-[18px] border border-dashed border-slate-300 bg-slate-50/80 p-3'>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
          {t('rawMaterials.batchEngine.canvas.selection')}
        </p>
        <p className='mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'>
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
      <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
        {t('rawMaterials.batchEngine.canvas.selection')}
      </p>
      <p className='mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'>
        {viewMode === 'formal' ? 'formal plan view' : 'preview view'}
      </p>
      <p className='mt-1.5 text-base font-black text-slate-900'>{zone.label}</p>
      <p className='mt-1 text-xs font-semibold text-slate-600'>{zone.detail || '--'}</p>

      <div className='mt-3 grid gap-1.5 text-xs font-semibold text-slate-700'>
        <InspectorRow label={t('rawMaterials.batchEngine.canvas.type')} value={zone.kind} />
        <InspectorRow label='类别' value={zone.usageCategory || '--'} />
        <InspectorRow label='差异热区' value={zone.isDiffHighlighted ? '是' : '否'} />
        <InspectorRow label='需求行' value={zone.demandLineId || '--'} />
        <InspectorRow label='卷材' value={zone.rollId || '--'} />
        <InspectorRow label='面积' value={zone.areaM2 ? `${zone.areaM2.toFixed(3)} m2` : '--'} />
        <InspectorRow label='覆盖占比' value={zone.coverageSharePercent ? `${zone.coverageSharePercent.toFixed(2)}%` : '--'} />
        <InspectorRow
          label={t('rawMaterials.batchEngine.canvas.position')}
          value={`${zone.x.toFixed(1)} / ${zone.y.toFixed(1)}`}
        />
        <InspectorRow
          label={t('rawMaterials.batchEngine.canvas.size')}
          value={`${zone.width.toFixed(1)} x ${zone.height.toFixed(1)}`}
        />
      </div>
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
