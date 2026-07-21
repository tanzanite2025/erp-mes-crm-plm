export type VehicleLoadingSourceType = 'manual' | 'packing-rule'

export type VehicleLoadingSourceOption = {
  id: VehicleLoadingSourceType
  label: string
  description: string
}

export const VEHICLE_LOADING_SOURCE_OPTIONS: VehicleLoadingSourceOption[] = [
  {
    id: 'manual',
    label: '装箱汇总输入',
    description: '使用当前出货汇总估算单箱重量与箱型参数',
  },
  {
    id: 'packing-rule',
    label: '包装规则箱型',
    description: '使用已维护的包装规则箱型参数参与推荐',
  },
]

export function getVehicleLoadingSourceConfig(
  source: VehicleLoadingSourceType
): VehicleLoadingSourceOption {
  return (
    VEHICLE_LOADING_SOURCE_OPTIONS.find((item) => item.id === source) ??
    VEHICLE_LOADING_SOURCE_OPTIONS[0]
  )
}
