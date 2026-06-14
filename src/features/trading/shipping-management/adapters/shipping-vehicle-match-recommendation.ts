import type { ShipmentSummary } from '@/features/logistics-config/vehicle-loading/data/vehicle-loading.types'
import type { ShippingVehicleMatchItem } from '../types'

export function resolveShippingVehicleMatchRecommendationSummary(
  item: ShippingVehicleMatchItem | null
): {
  summary: ShipmentSummary | null
  error: Error | null
} {
  if (!item) {
    return {
      summary: null,
      error: new Error('未选择待匹配发货记录'),
    }
  }

  if (item.boxCount === null || item.boxCount <= 0) {
    return {
      summary: null,
      error: new Error('当前行缺少有效箱数，无法计算车型推荐'),
    }
  }

  if (item.volumeM3 === null || item.volumeM3 <= 0) {
    return {
      summary: null,
      error: new Error('当前行缺少有效总体积，无法计算车型推荐'),
    }
  }

  if (item.weightKg === null || item.weightKg <= 0) {
    return {
      summary: null,
      error: new Error('当前行缺少有效总重量，无法计算车型推荐'),
    }
  }

  return {
    summary: {
      boxes: item.boxCount,
      totalVolumeM3: item.volumeM3,
      totalWeightKg: item.weightKg,
    },
    error: null,
  }
}
