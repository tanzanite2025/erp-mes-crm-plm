import type { VehicleCategory } from './vehicle-loading.types'

export function categoryLabel(category: VehicleCategory): string {
  switch (category) {
    case 'van':
      return '面包车'
    case 'boxTruck':
      return '厢式货车'
    case 'lightTruck':
      return '轻卡'
    case 'mediumTruck':
      return '中卡'
    default:
      return category
  }
}
