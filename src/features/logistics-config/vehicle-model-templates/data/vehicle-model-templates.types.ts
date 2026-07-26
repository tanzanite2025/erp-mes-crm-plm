import type {
  VehicleModelTemplate,
  VehicleModelTemplateFootprint,
  VehicleModelTemplateSourceFormat,
} from '../../shared/vehicle-model-template.types'
import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'

export type VehicleModelTemplateSourceAsset = {
  url: string
  fileName: string
  format: Exclude<VehicleModelTemplateSourceFormat, 'seed-spec'>
}

export type VehicleModelTemplateDraft = VehicleModelTemplate & {
  version: number
}

export type VehicleModelTemplateRegistryRecord = VehicleModelTemplateDraft & {
  createdAtIso: string
  updatedAtIso: string
}

export type VehicleModelTemplateDraftInput = {
  vehicleSpec: VehicleSpec
  sourceAsset?: VehicleModelTemplateSourceAsset
  templateName?: string
}

export type VehicleModelTemplatePreviewInput =
  VehicleModelTemplateDraftInput & {
    templateId?: string
  }

export type VehicleModelTemplatePreviewFootprint = VehicleModelTemplateFootprint

export type VehicleModelTemplateDTO = Omit<
  VehicleModelTemplate,
  'sourceAssetName' | 'sourceAssetUrl'
> & {
  sourceAssetName: string
  sourceAssetUrl: string
  version: number
  versionCount: number
  createdAt: string
  updatedAt: string
}

export type VehicleModelTemplateVersionDTO = Omit<
  VehicleModelTemplateDTO,
  'versionCount'
> & {
  templateId: string
  snapshot?: unknown
}
