import type {
  LoadingRuleResult,
  Orientation,
  VehicleLoadSpace,
} from './load-planning.types'

export function checkVehicleConstraints(
  vehicle: VehicleLoadSpace,
  orientation: Orientation,
  unitWeightKg: number
): LoadingRuleResult[] {
  const results: LoadingRuleResult[] = []

  if (
    orientation.lengthMm <= 0 ||
    orientation.widthMm <= 0 ||
    orientation.heightMm <= 0
  ) {
    results.push({
      passed: false,
      code: 'invalid_orientation',
      message: '箱体尺寸非法',
    })
    return results
  }

  if (
    vehicle.usableInnerSize.lengthMm <= 0 ||
    vehicle.usableInnerSize.widthMm <= 0 ||
    vehicle.usableInnerSize.heightMm <= 0
  ) {
    results.push({
      passed: false,
      code: 'invalid_vehicle_space',
      message: '车辆可用空间非法',
    })
  }

  if (vehicle.payloadKg <= 0) {
    results.push({
      passed: false,
      code: 'invalid_payload',
      message: '车辆载重非法',
    })
  }

  if (unitWeightKg <= 0) {
    results.push({
      passed: false,
      code: 'invalid_package_weight',
      message: '单箱重量非法',
    })
  }

  if (orientation.lengthMm > vehicle.usableInnerSize.lengthMm) {
    results.push({
      passed: false,
      code: 'length_exceeded',
      message: '箱长超过车厢可用长度',
    })
  }

  if (orientation.widthMm > vehicle.usableInnerSize.widthMm) {
    results.push({
      passed: false,
      code: 'width_exceeded',
      message: '箱宽超过车厢可用宽度',
    })
  }

  if (orientation.heightMm > vehicle.usableInnerSize.heightMm) {
    results.push({
      passed: false,
      code: 'height_exceeded',
      message: '箱高超过车厢可用高度',
    })
  }

  if (unitWeightKg > vehicle.payloadKg) {
    results.push({
      passed: false,
      code: 'weight_exceeded',
      message: '单箱重量超过车辆载重',
    })
  }

  return results
}
