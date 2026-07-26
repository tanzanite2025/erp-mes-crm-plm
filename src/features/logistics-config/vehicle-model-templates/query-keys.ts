export const vehicleModelTemplateQueryKeys = {
  all: ['vehicle-model-templates'] as const,
  list: (seedVehicleSpecId?: string) =>
    [
      ...vehicleModelTemplateQueryKeys.all,
      'list',
      seedVehicleSpecId ?? 'all',
    ] as const,
  versions: (templateId?: string) =>
    [
      ...vehicleModelTemplateQueryKeys.all,
      'versions',
      templateId ?? 'none',
    ] as const,
}
