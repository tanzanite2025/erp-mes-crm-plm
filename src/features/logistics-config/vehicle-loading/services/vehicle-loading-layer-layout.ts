import type {
  VehicleLoadingPreviewPlacedBox,
  VehicleLoadingPreviewSize,
} from '../data/vehicle-loading-preview-scene.types'
import type { VehicleLoadingOrientation } from '../data/vehicle-loading.types'

export type VehicleLoadingLayerLayout = {
  columnsAlongLength: number
  rowsAlongWidth: number
  totalSlots: number
  occupiedSlots: number
  occupancyRate: number
  boxFootprintLengthMm: number
  boxFootprintWidthMm: number
  vehicleLengthMm: number
  vehicleWidthMm: number
  vehicleAspectRatio: number
  arrangementText: string
  usesRealDimensions: boolean
  exceedsVehicleFootprint: boolean
}

type BuildVehicleLoadingLayerLayoutOptions = {
  boxesPerLayer: number
  vehicleSize: VehicleLoadingPreviewSize
  packageSize: VehicleLoadingPreviewSize
  orientation?: VehicleLoadingOrientation
  placements?: VehicleLoadingPreviewPlacedBox[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function safePositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function countWholeItems(containerMm: number, itemMm: number) {
  const container = safePositiveNumber(containerMm)
  const item = safePositiveNumber(itemMm)
  if (container === 0 || item === 0) return 0
  return Math.max(Math.floor(container / item), 0)
}

function buildFallbackGridDimensions(totalBoxes: number) {
  if (totalBoxes <= 0) return { columnsAlongLength: 1, rowsAlongWidth: 1 }
  const columnsAlongLength = Math.max(1, Math.ceil(Math.sqrt(totalBoxes)))
  const rowsAlongWidth = Math.max(1, Math.ceil(totalBoxes / columnsAlongLength))
  return { columnsAlongLength, rowsAlongWidth }
}

function resolvePackageFootprint(
  packageSize: VehicleLoadingPreviewSize,
  orientation?: VehicleLoadingOrientation
) {
  if (orientation) {
    return {
      boxFootprintLengthMm: orientation.lengthMm,
      boxFootprintWidthMm: orientation.widthMm,
      arrangementText: `朝向 ${orientation.label} · 长轴取 ${orientation.lengthAxis}，宽轴取 ${orientation.widthAxis}`,
    }
  }

  return {
    boxFootprintLengthMm: packageSize.lengthMm,
    boxFootprintWidthMm: packageSize.widthMm,
    arrangementText: '标准朝向',
  }
}

function resolveRealGridDimensions({
  boxesPerLayer,
  vehicleLengthMm,
  vehicleWidthMm,
  boxFootprintLengthMm,
  boxFootprintWidthMm,
}: {
  boxesPerLayer: number
  vehicleLengthMm: number
  vehicleWidthMm: number
  boxFootprintLengthMm: number
  boxFootprintWidthMm: number
}) {
  const maxColumnsAlongLength = countWholeItems(
    vehicleLengthMm,
    boxFootprintLengthMm
  )
  const maxRowsAlongWidth = countWholeItems(vehicleWidthMm, boxFootprintWidthMm)

  if (maxColumnsAlongLength === 0 || maxRowsAlongWidth === 0) {
    return {
      ...buildFallbackGridDimensions(boxesPerLayer),
      exceedsVehicleFootprint: true,
    }
  }

  const columnsAlongLength = Math.min(maxColumnsAlongLength, boxesPerLayer)
  const rowsAlongWidth = Math.max(
    1,
    Math.ceil(boxesPerLayer / columnsAlongLength)
  )

  if (rowsAlongWidth <= maxRowsAlongWidth) {
    return {
      columnsAlongLength,
      rowsAlongWidth,
      exceedsVehicleFootprint: false,
    }
  }

  const constrainedRowsAlongWidth = Math.max(1, maxRowsAlongWidth)
  const constrainedColumnsAlongLength = Math.max(
    1,
    Math.ceil(boxesPerLayer / constrainedRowsAlongWidth)
  )

  return {
    columnsAlongLength: constrainedColumnsAlongLength,
    rowsAlongWidth: constrainedRowsAlongWidth,
    exceedsVehicleFootprint:
      constrainedColumnsAlongLength > maxColumnsAlongLength,
  }
}

function buildExactPlacementLayerLayout({
  placements,
  vehicleSize,
}: {
  placements: VehicleLoadingPreviewPlacedBox[]
  vehicleSize: VehicleLoadingPreviewSize
}): VehicleLoadingLayerLayout | null {
  const vehicleLengthMm = safePositiveNumber(vehicleSize.lengthMm)
  const vehicleWidthMm = safePositiveNumber(vehicleSize.widthMm)
  if (vehicleLengthMm === 0 || vehicleWidthMm === 0) return null

  const columnsAlongLength =
    Math.max(...placements.map((placement) => placement.columnIndex), 0) + 1
  const rowsAlongWidth =
    Math.max(...placements.map((placement) => placement.rowIndex), 0) + 1
  const occupiedAreaMm2 = placements.reduce(
    (total, placement) =>
      total + placement.dimension.lengthMm * placement.dimension.widthMm,
    0
  )
  const vehicleAreaMm2 = vehicleLengthMm * vehicleWidthMm
  const occupiedSlots = placements.length
  const totalSlots = Math.max(
    columnsAlongLength * rowsAlongWidth,
    occupiedSlots
  )

  return {
    columnsAlongLength,
    rowsAlongWidth,
    totalSlots,
    occupiedSlots,
    occupancyRate:
      vehicleAreaMm2 > 0 ? Math.min(occupiedAreaMm2 / vehicleAreaMm2, 1) : 0,
    boxFootprintLengthMm: placements[0]?.dimension.lengthMm ?? 0,
    boxFootprintWidthMm: placements[0]?.dimension.widthMm ?? 0,
    vehicleLengthMm,
    vehicleWidthMm,
    vehicleAspectRatio: clamp(vehicleLengthMm / vehicleWidthMm, 1.2, 4.5),
    arrangementText: 'WASM 坐标布局 · 按真实 x/y 坐标绘制',
    usesRealDimensions: true,
    exceedsVehicleFootprint: false,
  }
}

export function buildVehicleLoadingLayerLayout({
  boxesPerLayer,
  vehicleSize,
  packageSize,
  orientation,
  placements,
}: BuildVehicleLoadingLayerLayoutOptions): VehicleLoadingLayerLayout {
  if (placements && placements.length > 0) {
    const exactPlacementLayout = buildExactPlacementLayerLayout({
      placements,
      vehicleSize,
    })
    if (exactPlacementLayout) return exactPlacementLayout
  }

  const actualBoxesPerLayer = Math.max(0, boxesPerLayer)
  const normalizedBoxesPerLayer = Math.max(1, actualBoxesPerLayer)
  const footprint = resolvePackageFootprint(packageSize, orientation)
  const fallbackGrid = buildFallbackGridDimensions(normalizedBoxesPerLayer)
  const boxFootprintLengthMm =
    safePositiveNumber(footprint.boxFootprintLengthMm) ||
    fallbackGrid.columnsAlongLength
  const boxFootprintWidthMm =
    safePositiveNumber(footprint.boxFootprintWidthMm) ||
    fallbackGrid.rowsAlongWidth
  const hasRealVehicleFootprint =
    safePositiveNumber(vehicleSize.lengthMm) > 0 &&
    safePositiveNumber(vehicleSize.widthMm) > 0

  if (!hasRealVehicleFootprint) {
    const vehicleLengthMm =
      boxFootprintLengthMm * fallbackGrid.columnsAlongLength
    const vehicleWidthMm = boxFootprintWidthMm * fallbackGrid.rowsAlongWidth
    const totalSlots =
      fallbackGrid.columnsAlongLength * fallbackGrid.rowsAlongWidth

    return {
      ...fallbackGrid,
      totalSlots,
      occupiedSlots: Math.min(actualBoxesPerLayer, totalSlots),
      occupancyRate:
        totalSlots > 0 ? Math.min(actualBoxesPerLayer / totalSlots, 1) : 0,
      boxFootprintLengthMm,
      boxFootprintWidthMm,
      vehicleLengthMm,
      vehicleWidthMm,
      vehicleAspectRatio: clamp(vehicleLengthMm / vehicleWidthMm, 1.2, 4.5),
      arrangementText: footprint.arrangementText,
      usesRealDimensions: false,
      exceedsVehicleFootprint: false,
    }
  }

  const vehicleLengthMm = safePositiveNumber(vehicleSize.lengthMm)
  const vehicleWidthMm = safePositiveNumber(vehicleSize.widthMm)
  const realGrid = resolveRealGridDimensions({
    boxesPerLayer: normalizedBoxesPerLayer,
    vehicleLengthMm,
    vehicleWidthMm,
    boxFootprintLengthMm,
    boxFootprintWidthMm,
  })
  const totalSlots = realGrid.columnsAlongLength * realGrid.rowsAlongWidth

  return {
    ...realGrid,
    totalSlots,
    occupiedSlots: Math.min(actualBoxesPerLayer, totalSlots),
    occupancyRate:
      totalSlots > 0 ? Math.min(actualBoxesPerLayer / totalSlots, 1) : 0,
    boxFootprintLengthMm,
    boxFootprintWidthMm,
    vehicleLengthMm,
    vehicleWidthMm,
    vehicleAspectRatio: clamp(vehicleLengthMm / vehicleWidthMm, 1.2, 4.5),
    arrangementText: footprint.arrangementText,
    usesRealDimensions: true,
  }
}
