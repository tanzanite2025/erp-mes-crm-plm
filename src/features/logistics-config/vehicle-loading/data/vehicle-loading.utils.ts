import type { VehicleCategory } from './vehicle-loading.types'

export type VehicleCategoryLabelKey =
  | 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.van'
  | 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.boxTruck'
  | 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.lightTruck'
  | 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.mediumTruck'

export function categoryLabelKey(
  category: VehicleCategory
): VehicleCategoryLabelKey {
  switch (category) {
    case 'van':
      return 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.van'
    case 'boxTruck':
      return 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.boxTruck'
    case 'lightTruck':
      return 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.lightTruck'
    case 'mediumTruck':
      return 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.mediumTruck'
    default:
      return 'logisticsConfig.vehicleSpecsLibrary.vehicleCategories.van'
  }
}
