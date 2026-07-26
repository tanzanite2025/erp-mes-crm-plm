import type { VehicleModelTemplateDTO } from '../../vehicle-model-templates/data/vehicle-model-templates.types'
import { parseVehicleModelTemplateGeometry } from '../../vehicle-model-templates/services/vehicle-model-template-service'
import {
  VEHICLE_GEOMETRY_SCHEMA_VERSION,
  type VehicleGeometry,
  type VehicleLoadingGeometryProjection,
} from '../data/vehicle-loading-wasm-geometry.types'
import { projectVehicleGeometryToLoadingSpaceWithWasm } from './vehicle-loading-wasm-engine'

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseVehicleGeometryFromTemplateResponse(
  geometry: unknown,
  template: VehicleModelTemplateDTO
): VehicleGeometry {
  if (!isObjectRecord(geometry)) {
    throw new Error(`车型模型模板 ${template.name} 未返回有效几何对象。`)
  }
  if (geometry.schemaVersion !== VEHICLE_GEOMETRY_SCHEMA_VERSION) {
    throw new Error(
      `车型模型模板 ${template.name} 几何协议错误：${String(
        geometry.schemaVersion ?? '缺失'
      )}`
    )
  }
  return geometry as VehicleGeometry
}

export async function projectVehicleModelTemplateGeometryToLoadingSpace(
  modelTemplate?: VehicleModelTemplateDTO | null
): Promise<VehicleLoadingGeometryProjection | null> {
  if (!modelTemplate || modelTemplate.sourceFormat !== 'glb') {
    return null
  }

  const { geometry } = await parseVehicleModelTemplateGeometry(modelTemplate.id)
  return projectVehicleGeometryToLoadingSpaceWithWasm(
    parseVehicleGeometryFromTemplateResponse(geometry, modelTemplate)
  )
}
