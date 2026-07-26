export {
  buildVehicleModelTemplateFromVehicleSpec,
  buildVehicleModelTemplateDraftFromVehicleSpec,
  formatVehicleModelTemplateSourceLabel,
  formatVehicleModelTemplateStatusLabel,
  inferVehicleModelTemplateSourceFormat,
  selectLatestVehicleModelTemplateForSeedVehicle,
} from './services/vehicle-model-template-registry'
export {
  getVehicleModelTemplates,
  getVehicleModelTemplateVersions,
  restoreVehicleModelTemplateVersion,
  saveVehicleModelTemplate,
} from './services/vehicle-model-template-service'
export type {
  VehicleModelTemplateDraft,
  VehicleModelTemplateDraftInput,
  VehicleModelTemplateDTO,
  VehicleModelTemplatePreviewFootprint,
  VehicleModelTemplatePreviewInput,
  VehicleModelTemplateRegistryRecord,
  VehicleModelTemplateSourceAsset,
  VehicleModelTemplateVersionDTO,
} from './data/vehicle-model-templates.types'
