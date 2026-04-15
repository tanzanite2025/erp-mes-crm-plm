import { describe, expect, it } from 'vitest'
import type { PackageLoadProfile, VehicleLoadSpace } from './load-planning.types'
import { buildVehicleLoadingPlan } from './vehicle-loading-engine'
import { getPackageOrientations } from './vehicle-orientation'
import { checkVehicleConstraints } from './vehicle-loading-rules'
import { calculateLoadPlanForOrientation } from './vehicle-pack-layout'

const packageProfile: PackageLoadProfile = {
  packageId: 'pkg-1',
  name: '测试箱型',
  quantity: 120,
  dimension: {
    lengthMm: 660,
    widthMm: 660,
    heightMm: 800,
    canRotate: true,
    canInvert: false,
  },
  unitWeightKg: 7.5,
}

const vehicle: VehicleLoadSpace = {
  id: 'van-large',
  name: '面包车（加长）',
  usableInnerSize: {
    lengthMm: 3000,
    widthMm: 1500,
    heightMm: 1300,
  },
  payloadKg: 900,
  volumeM3: 5,
  isBoxBody: false,
}

describe('load-planning engine', () => {
  it('enumerates unique orientations', () => {
    const orientations = getPackageOrientations(packageProfile.dimension)
    expect(orientations.length).toBeGreaterThan(0)
    expect(new Set(orientations.map((item) => item.label)).size).toBe(orientations.length)
  })

  it('keeps height fixed when canRotate is true but canInvert is false', () => {
    const orientations = getPackageOrientations({
      ...packageProfile.dimension,
      lengthMm: 700,
      widthMm: 500,
      heightMm: 600,
      canRotate: true,
      canInvert: false,
    })

    expect(orientations).toHaveLength(2)
    expect(orientations.map((item) => item.label)).toEqual(['L-W-H', 'W-L-H'])
    expect(orientations.every((item) => item.heightMm === 600)).toBe(true)
  })

  it('allows changing vertical direction only when canInvert is true', () => {
    const orientations = getPackageOrientations({
      ...packageProfile.dimension,
      lengthMm: 700,
      widthMm: 500,
      heightMm: 600,
      canRotate: true,
      canInvert: true,
    })

    expect(orientations).toHaveLength(6)
    expect(orientations.some((item) => item.heightMm !== 600)).toBe(true)
  })

  it('passes vehicle constraints for a fitting orientation', () => {
    const orientations = getPackageOrientations(packageProfile.dimension)
    const result = checkVehicleConstraints(vehicle, orientations[0], packageProfile.unitWeightKg)
    expect(result.every((item) => item.passed)).toBe(true)
  })

  it('calculates a load plan for a fitting orientation', () => {
    const orientations = getPackageOrientations(packageProfile.dimension)
    const plan = calculateLoadPlanForOrientation(vehicle, orientations[0], packageProfile.quantity, packageProfile.unitWeightKg)
    expect(plan).not.toBeNull()
    expect(plan?.feasible).toBe(true)
    expect(plan?.maxBoxesPerVehicle).toBeGreaterThan(0)
  })

  it('builds a recommendation plan sorted by best load', () => {
    const plan = buildVehicleLoadingPlan({
      packageProfile,
      vehicles: [vehicle],
    })

    expect(plan.plans.length).toBeGreaterThan(0)
    expect(plan.bestPlan?.vehicleId).toBe(vehicle.id)
    expect(plan.engineVersion).toBeTruthy()
  })
})
