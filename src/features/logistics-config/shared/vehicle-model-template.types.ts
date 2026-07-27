export type VehicleModelTemplateFootprint = {
  lengthMm: number
  widthMm: number
  heightMm: number
}

export type VehicleModelTemplateSourceFormat = 'seed-spec' | 'glb'

export type VehicleModelTemplateStatus = 'seed-only' | 'uploaded' | 'normalized'

export type VehicleModelTemplate = {
  id: string
  name: string
  seedVehicleSpecId: string
  seedVehicleName: string
  sourceFormat: VehicleModelTemplateSourceFormat
  status: VehicleModelTemplateStatus
  sourceAssetName?: string
  sourceAssetUrl?: string
  normalizedFootprint: VehicleModelTemplateFootprint
  notes: string[]
}

export const VEHICLE_MODEL_TEMPLATE_SOURCE_FORMATS: VehicleModelTemplateSourceFormat[] =
  ['seed-spec', 'glb']

export const VEHICLE_MODEL_TEMPLATE_ACCEPT = '.glb'
