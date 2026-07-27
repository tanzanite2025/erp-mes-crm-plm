import type {
  VehicleLoadingPlanBlockedSpaceInput,
  VehicleLoadingPlanDimensionsMm,
  VehicleLoadingPlanWarning,
} from './vehicle-loading-wasm-plan.types'

export const VEHICLE_GEOMETRY_SCHEMA_VERSION = 'vehicle-geometry.v1'

export const VEHICLE_LOADING_GEOMETRY_PROJECTION_SCHEMA_VERSION =
  'vehicle-loading-geometry-projection.v1'

export type VehicleGeometryAabbMm = {
  minMm: [number, number, number]
  maxMm: [number, number, number]
  lengthMm: number
  widthMm: number
  heightMm: number
}

export type VehicleGeometryCoordinateSystem = {
  lengthAxis: string
  widthAxis: string
  heightAxis: string
}

export type VehicleGeometryPartKind =
  | 'usable-space'
  | 'obstacle'
  | 'keep-out'
  | 'door'
  | 'reference'

export type VehicleGeometryCollisionKind = 'aabb' | 'obb' | 'none'

export type VehicleGeometryObbMm = {
  centerMm: [number, number, number]
  halfExtentsMm: [number, number, number]
  axes: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ]
}

export type VehicleGeometryPart = {
  id: string
  kind: VehicleGeometryPartKind
  collision: VehicleGeometryCollisionKind
  bounds: VehicleGeometryAabbMm
  obb?: VehicleGeometryObbMm
  positionMm: [number, number, number]
  nodeIndex: number
  meshIndex: number
  vertexCount: number
}

export type VehicleGeometryWarning = {
  code: string
  message: string
  partId?: string
}

export type VehicleGeometry = {
  schemaVersion: typeof VEHICLE_GEOMETRY_SCHEMA_VERSION
  sourceFormat: string
  unit: string
  coordinateSystem: VehicleGeometryCoordinateSystem
  bounds: VehicleGeometryAabbMm
  parts: VehicleGeometryPart[]
  warnings: VehicleGeometryWarning[]
}

export type VehicleLoadingGeometryProjection = {
  schemaVersion: typeof VEHICLE_LOADING_GEOMETRY_PROJECTION_SCHEMA_VERSION
  usableSpace: VehicleLoadingPlanDimensionsMm
  blockedSpaces: VehicleLoadingPlanBlockedSpaceInput[]
  warnings: VehicleLoadingPlanWarning[]
}
