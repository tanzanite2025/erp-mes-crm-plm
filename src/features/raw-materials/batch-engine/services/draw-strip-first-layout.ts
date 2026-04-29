import type {
  StripFirstLayout,
  StripLayoutPoint,
  StripLayoutZone,
  StripLayoutZoneKind,
} from './build-strip-first-layout'

export type BatchCanvasViewport = {
  scale: number
  offsetX: number
  offsetY: number
}

type DrawOptions = {
  context: CanvasRenderingContext2D
  cssWidth: number
  cssHeight: number
  dpr: number
  layout: StripFirstLayout
  viewport: BatchCanvasViewport
  hoveredZoneId?: string
  selectedZoneId?: string
  highlightedDemandLineId?: string
  highlightedZoneIds?: string[]
  filteredRollIds?: string[]
}

type ZoneStyle = {
  fill: string
  stroke: string
  text: string
}

function getZoneStyle(kind: StripLayoutZoneKind): ZoneStyle {
  switch (kind) {
    case 'roll':
      return {
        fill: 'rgba(15, 23, 42, 0.85)',
        stroke: 'rgba(148, 163, 184, 0.6)',
        text: 'rgba(226, 232, 240, 0.95)',
      }
    case 'strip':
      return {
        fill: 'rgba(8, 145, 178, 0.3)',
        stroke: 'rgba(34, 211, 238, 0.85)',
        text: 'rgba(236, 254, 255, 0.95)',
      }
    case 'piece':
      return {
        fill: 'rgba(16, 185, 129, 0.36)',
        stroke: 'rgba(52, 211, 153, 0.9)',
        text: 'rgba(209, 250, 229, 0.95)',
      }
    case 'loss':
      return {
        fill: 'rgba(245, 158, 11, 0.32)',
        stroke: 'rgba(251, 191, 36, 0.92)',
        text: 'rgba(254, 243, 199, 0.95)',
      }
    case 'aggregate':
      return {
        fill: 'rgba(100, 116, 139, 0.35)',
        stroke: 'rgba(148, 163, 184, 0.9)',
        text: 'rgba(226, 232, 240, 0.95)',
      }
    default:
      return {
        fill: 'rgba(148, 163, 184, 0.4)',
        stroke: 'rgba(148, 163, 184, 0.8)',
        text: 'rgba(241, 245, 249, 0.95)',
      }
  }
}

function drawBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const background = context.createLinearGradient(0, 0, 0, height)
  background.addColorStop(0, '#071028')
  background.addColorStop(1, '#1e293b')
  context.fillStyle = background
  context.fillRect(0, 0, width, height)
}

function drawGrid(
  context: CanvasRenderingContext2D,
  layout: StripFirstLayout,
  viewport: BatchCanvasViewport
) {
  const mmPerLine = viewport.scale >= 0.6 ? 100 : viewport.scale >= 0.22 ? 250 : 500
  const lineWidth = 1 / Math.max(viewport.scale, 0.001)
  const alpha = viewport.scale >= 0.22 ? 0.12 : 0.08

  context.save()
  context.translate(viewport.offsetX, viewport.offsetY)
  context.scale(viewport.scale, viewport.scale)

  context.lineWidth = lineWidth
  context.strokeStyle = `rgba(148, 163, 184, ${alpha})`
  context.beginPath()
  for (let x = 0; x <= layout.bounds.maxX; x += mmPerLine) {
    context.moveTo(x, 0)
    context.lineTo(x, layout.bounds.maxY)
  }
  for (let y = 0; y <= layout.bounds.maxY; y += mmPerLine) {
    context.moveTo(0, y)
    context.lineTo(layout.bounds.maxX, y)
  }
  context.stroke()

  context.restore()
}

function drawZoneLabel(
  context: CanvasRenderingContext2D,
  zone: StripLayoutZone,
  style: ZoneStyle,
  viewport: BatchCanvasViewport
) {
  const bounds = resolveZoneBounds(zone)
  const scale = Math.max(viewport.scale, 0.001)
  const pxWidth = bounds.width * scale
  const pxHeight = bounds.height * scale
  if (pxWidth < 58 || pxHeight < 20 || zone.id === 'roll-empty') return

  const paddingXPx = Math.min(12, pxWidth * 0.12)
  const paddingYPx = Math.min(8, pxHeight * 0.2)
  const paddingX = paddingXPx / scale
  const paddingY = paddingYPx / scale
  const labelWidth = bounds.width - paddingX * 2
  const labelHeight = bounds.height - paddingY * 2
  if (labelWidth <= 0 || labelHeight <= 0) return

  const fontSizePx = Math.max(9, Math.min(12, Math.min(pxHeight * 0.42, pxWidth * 0.16)))

  context.save()
  context.beginPath()
  context.rect(bounds.x + paddingX, bounds.y + paddingY, labelWidth, labelHeight)
  context.clip()
  context.fillStyle = style.text
  context.font = `${fontSizePx / scale}px "Segoe UI", Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(zone.label, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, labelWidth)
  context.restore()
}

function resolvePolygonBounds(points: StripLayoutPoint[]) {
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y
  for (const point of points.slice(1)) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, minY, maxX, maxY }
}

function resolveZoneBounds(zone: StripLayoutZone) {
  if (zone.polygonPoints?.length) {
    const bounds = resolvePolygonBounds(zone.polygonPoints)
    return {
      x: bounds.minX,
      y: bounds.minY,
      width: Math.max(bounds.maxX - bounds.minX, 0),
      height: Math.max(bounds.maxY - bounds.minY, 0),
    }
  }
  return {
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
  }
}

function traceZonePath(context: CanvasRenderingContext2D, zone: StripLayoutZone) {
  context.beginPath()
  if (zone.polygonPoints?.length) {
    context.moveTo(zone.polygonPoints[0].x, zone.polygonPoints[0].y)
    for (const point of zone.polygonPoints.slice(1)) {
      context.lineTo(point.x, point.y)
    }
    context.closePath()
    return
  }
  context.rect(zone.x, zone.y, zone.width, zone.height)
}

function pointInPolygon(point: StripLayoutPoint, polygonPoints: StripLayoutPoint[]) {
  let inside = false
  for (let index = 0, previousIndex = polygonPoints.length - 1; index < polygonPoints.length; previousIndex = index++) {
    const current = polygonPoints[index]
    const previous = polygonPoints[previousIndex]
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y || 1e-9) + current.x
    if (intersects) {
      inside = !inside
    }
  }
  return inside
}

function drawZone(
  context: CanvasRenderingContext2D,
  zone: StripLayoutZone,
  viewport: BatchCanvasViewport,
  hoveredZoneId?: string,
  selectedZoneId?: string,
  highlightedDemandLineId?: string,
  highlightedZoneIds?: string[],
  filteredRollIds?: string[]
) {
  const style = getZoneStyle(zone.kind)
  const lineWidth = 1 / Math.max(viewport.scale, 0.001)
  const isHovered = hoveredZoneId === zone.id
  const isSelected = selectedZoneId === zone.id
  const isHighlighted = Boolean(highlightedDemandLineId) && zone.demandLineId === highlightedDemandLineId
  const isLinkedHighlighted = Boolean(highlightedZoneIds?.includes(zone.id))
  const isDiffHighlighted = Boolean(zone.isDiffHighlighted)
  const isFilteredOut = Boolean(filteredRollIds?.length && zone.rollId && !filteredRollIds.includes(zone.rollId))

  context.save()
  if (isFilteredOut) {
    context.globalAlpha = 0.18
  }
  context.fillStyle = style.fill
  context.strokeStyle = style.stroke
  context.lineWidth = lineWidth
  traceZonePath(context, zone)
  context.fill()
  context.stroke()

  if (isHovered || isSelected) {
    context.strokeStyle = isSelected ? 'rgba(244, 114, 182, 1)' : 'rgba(56, 189, 248, 1)'
    context.lineWidth = (isSelected ? 2.6 : 2) / Math.max(viewport.scale, 0.001)
    traceZonePath(context, zone)
    context.stroke()
  }

  if (isHighlighted && !isSelected) {
    context.strokeStyle = 'rgba(251, 191, 36, 1)'
    context.lineWidth = 2.2 / Math.max(viewport.scale, 0.001)
    traceZonePath(context, zone)
    context.stroke()
  }

  if (isLinkedHighlighted && !isSelected) {
    context.strokeStyle = 'rgba(168, 85, 247, 1)'
    context.lineWidth = 2.8 / Math.max(viewport.scale, 0.001)
    traceZonePath(context, zone)
    context.stroke()
  }

  if (isDiffHighlighted && !isSelected) {
    context.strokeStyle = 'rgba(244, 63, 94, 1)'
    context.lineWidth = 2.4 / Math.max(viewport.scale, 0.001)
    traceZonePath(context, zone)
    context.stroke()
  }

  drawZoneLabel(context, zone, style, viewport)
  context.restore()
}

export function drawStripFirstLayout(options: DrawOptions) {
  const {
    context,
    cssWidth,
    cssHeight,
    dpr,
    layout,
    viewport,
    hoveredZoneId,
    selectedZoneId,
    highlightedDemandLineId,
    highlightedZoneIds,
    filteredRollIds,
  } = options

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, cssWidth, cssHeight)
  drawBackground(context, cssWidth, cssHeight)
  drawGrid(context, layout, viewport)

  context.save()
  context.translate(viewport.offsetX, viewport.offsetY)
  context.scale(viewport.scale, viewport.scale)
  for (const zone of layout.zones) {
    drawZone(context, zone, viewport, hoveredZoneId, selectedZoneId, highlightedDemandLineId, highlightedZoneIds, filteredRollIds)
  }
  context.restore()
}

export function createFitViewport(
  layout: StripFirstLayout,
  canvasWidth: number,
  canvasHeight: number
): BatchCanvasViewport {
  const padding = 24
  const contentWidth = Math.max(layout.bounds.maxX - layout.bounds.minX, 1)
  const contentHeight = Math.max(layout.bounds.maxY - layout.bounds.minY, 1)

  const availableWidth = Math.max(canvasWidth - padding * 2, 1)
  const availableHeight = Math.max(canvasHeight - padding * 2, 1)
  const scale = Math.max(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
    0.02
  )

  const centeredOffsetX =
    padding + (availableWidth - contentWidth * scale) / 2 - layout.bounds.minX * scale
  const centeredOffsetY =
    padding + (availableHeight - contentHeight * scale) / 2 - layout.bounds.minY * scale

  return {
    scale,
    offsetX: centeredOffsetX,
    offsetY: centeredOffsetY,
  }
}

export function screenToWorld(
  viewport: BatchCanvasViewport,
  screenX: number,
  screenY: number
) {
  return {
    x: (screenX - viewport.offsetX) / viewport.scale,
    y: (screenY - viewport.offsetY) / viewport.scale,
  }
}

export function hitTestZone(
  layout: StripFirstLayout,
  viewport: BatchCanvasViewport,
  screenX: number,
  screenY: number
): StripLayoutZone | null {
  const worldPoint = screenToWorld(viewport, screenX, screenY)
  for (let index = layout.zones.length - 1; index >= 0; index -= 1) {
    const zone = layout.zones[index]
    if (!zone || !zone.interactive) continue
    if (zone.polygonPoints?.length) {
      if (pointInPolygon(worldPoint, zone.polygonPoints)) {
        return zone
      }
      continue
    }
    if (
      worldPoint.x >= zone.x &&
      worldPoint.x <= zone.x + zone.width &&
      worldPoint.y >= zone.y &&
      worldPoint.y <= zone.y + zone.height
    ) {
      return zone
    }
  }
  return null
}

export function clampScale(scale: number) {
  return Math.min(Math.max(scale, 0.015), 3.5)
}
