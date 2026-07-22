import type { VehicleSpec } from './vehicle-specs.types'

function buildVehicleSpecSearchText(spec: VehicleSpec): string {
  return [
    spec.id,
    spec.name,
    spec.category,
    spec.notes,
    `${spec.payloadKg}`,
    `${spec.volumeM3}`,
    `${spec.nominalVolumeM3}`,
  ]
    .join(' ')
    .toLowerCase()
}

export function filterVehicleSpecsByKeyword(
  vehicleSpecs: VehicleSpec[],
  search: string
): VehicleSpec[] {
  const keyword = search.trim().toLowerCase()
  if (!keyword) return vehicleSpecs

  return vehicleSpecs.filter((spec) =>
    buildVehicleSpecSearchText(spec).includes(keyword)
  )
}
