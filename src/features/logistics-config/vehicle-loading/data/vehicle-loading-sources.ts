export type VehicleLoadingSourceType = 'packing-rule'

export type VehicleLoadingSourceOption = {
  id: VehicleLoadingSourceType
  label: string
  description: string
}

export const VEHICLE_LOADING_PACKING_RULE_SOURCE: VehicleLoadingSourceOption = {
  id: 'packing-rule',
  label: '包装规则箱型',
  description: '使用包装管理中已维护的箱型尺寸、重量和容量参与计算',
}

export function getVehicleLoadingSourceConfig(
  _source: VehicleLoadingSourceType = 'packing-rule'
): VehicleLoadingSourceOption {
  return VEHICLE_LOADING_PACKING_RULE_SOURCE
}
