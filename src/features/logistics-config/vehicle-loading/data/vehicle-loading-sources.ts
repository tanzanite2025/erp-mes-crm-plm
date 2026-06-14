export type VehicleLoadingSourceType = 'manual' | 'packing-rule' | 'api'

export type VehicleLoadingSourceOption = {
  id: VehicleLoadingSourceType
  label: string
  description: string
}

export const VEHICLE_LOADING_SOURCE_OPTIONS: VehicleLoadingSourceOption[] = [
  {
    id: 'manual',
    label: '手动试算',
    description: '使用页面内输入作为装载试算来源',
  },
  {
    id: 'packing-rule',
    label: '包装规则结果',
    description: '后续接入包装规则页计算结果',
  },
  { id: 'api', label: 'API 结果', description: '直接使用后端返回的装箱结果' },
]

export function getVehicleLoadingSourceConfig(
  source: VehicleLoadingSourceType
): VehicleLoadingSourceOption {
  return (
    VEHICLE_LOADING_SOURCE_OPTIONS.find((item) => item.id === source) ??
    VEHICLE_LOADING_SOURCE_OPTIONS[0]
  )
}
