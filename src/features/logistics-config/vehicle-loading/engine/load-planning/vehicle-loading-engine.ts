import type { PackageLoadProfile, VehicleLoadPlan, VehicleLoadPlanningInput, VehicleRecommendationPlan } from './load-planning.types'
import { comparePlans, isBetterPlan } from './vehicle-loading-explain'
import { calculateLoadPlanForOrientation } from './vehicle-pack-layout'
import { getPackageOrientations } from './vehicle-orientation'
import { checkVehicleConstraints } from './vehicle-loading-rules'

const ENGINE_VERSION = 'load-planning-0.2.0'

function buildRiskNotes(plan: VehicleLoadPlan, packageCount: number): string[] {
  const notes: string[] = []
  if (plan.maxBoxesPerVehicle < packageCount) {
    notes.push('单车无法装完全部箱数')
  }
  if (plan.weightUtilization > 0.85) {
    notes.push('重量利用率较高，请复核载重余量')
  }
  if (plan.volumeUtilization > 0.85) {
    notes.push('体积利用率较高，请复核装载余量')
  }
  return notes
}

function buildPackageWarnings(packageProfile: PackageLoadProfile): string[] {
  const warnings: string[] = []
  if (packageProfile.quantity <= 0) warnings.push('装箱数量必须大于 0')
  if (packageProfile.unitWeightKg <= 0) warnings.push('单箱重量必须大于 0')
  if (packageProfile.dimension.lengthMm <= 0 || packageProfile.dimension.widthMm <= 0 || packageProfile.dimension.heightMm <= 0) {
    warnings.push('箱体尺寸必须大于 0')
  }
  return warnings
}

export function buildVehicleLoadingPlan(input: VehicleLoadPlanningInput): VehicleRecommendationPlan {
  const { packageProfile, vehicles } = input
  const warnings = buildPackageWarnings(packageProfile)

  if (warnings.length > 0) {
    return {
      plans: [],
      bestPlan: undefined,
      engineVersion: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      warnings,
    }
  }

  const orientations = getPackageOrientations(packageProfile.dimension)

  const plans = vehicles
    .map((vehicle) => {
      let bestPlan: VehicleLoadPlan | null = null

      for (const orientation of orientations) {
        const ruleResults = checkVehicleConstraints(vehicle, orientation, packageProfile.unitWeightKg)
        if (ruleResults.some((item) => !item.passed)) continue

        const plan = calculateLoadPlanForOrientation(
          vehicle,
          orientation,
          packageProfile.quantity,
          packageProfile.unitWeightKg
        )
        if (!plan) continue

        const enrichedPlan: VehicleLoadPlan = {
          ...plan,
          loadingReason: [
            ...plan.loadingReason,
            `箱型：${packageProfile.name}`,
            `数量：${packageProfile.quantity}`,
          ],
          riskNotes: buildRiskNotes(plan, packageProfile.quantity),
        }

        if (!bestPlan || isBetterPlan(enrichedPlan, bestPlan)) {
          bestPlan = enrichedPlan
        }
      }

      return bestPlan
    })
    .filter((plan): plan is VehicleLoadPlan => plan !== null)
    .sort(comparePlans)

  return {
    plans,
    bestPlan: plans[0],
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    warnings,
  }
}

export type { PackageLoadProfile, VehicleLoadPlan, VehicleLoadPlanningInput, VehicleRecommendationPlan }
