import type {
  StripFirstLayout,
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
  const pxWidth = zone.width * viewport.scale
  const pxHeight = zone.height * viewport.scale
  if (pxWidth < 58 || pxHeight < 20) return

  context.save()
  context.fillStyle = style.text
  context.font = `${Math.max(10 / viewport.scale, 5)}px "Segoe UI", Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(zone.label, zone.x + zone.width / 2, zone.y + zone.height / 2)
  context.restore()
}

function drawZone(
  context: CanvasRenderingContext2D,
  zone: StripLayoutZone,
  viewport: BatchCanvasViewport,
  hoveredZoneId?: string,
  selectedZoneId?: string
) {
  const style = getZoneStyle(zone.kind)
  const lineWidth = 1 / Math.max(viewport.scale, 0.001)
  const isHovered = hoveredZoneId === zone.id
  const isSelected = selectedZoneId === zone.id

  context.save()
  context.fillStyle = style.fill
  context.strokeStyle = style.stroke
  context.lineWidth = lineWidth
  context.fillRect(zone.x, zone.y, zone.width, zone.height)
  context.strokeRect(zone.x, zone.y, zone.width, zone.height)

  if (isHovered || isSelected) {
    context.strokeStyle = isSelected ? 'rgba(244, 114, 182, 1)' : 'rgba(56, 189, 248, 1)'
    context.lineWidth = (isSelected ? 2.6 : 2) / Math.max(viewport.scale, 0.001)
    context.strokeRect(zone.x, zone.y, zone.width, zone.height)
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
  } = options

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, cssWidth, cssHeight)
  drawBackground(context, cssWidth, cssHeight)
  drawGrid(context, layout, viewport)

  context.save()
  context.translate(viewport.offsetX, viewport.offsetY)
  context.scale(viewport.scale, viewport.scale)
  for (const zone of layout.zones) {
    drawZone(context, zone, viewport, hoveredZoneId, selectedZoneId)
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
