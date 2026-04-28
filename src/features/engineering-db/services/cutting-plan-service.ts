import {
  engineeringSpecService,
  type EngineeringSpec,
  type EngineeringSpecInput,
} from '@/features/engineering/services/engineering-spec-service'
import {
  cuttingPlanSchema,
  type CuttingPlan,
  type CuttingPlanInput,
} from '../data/cutting-plan-schema'

const CUTTING_PLAN_SPEC_TYPE = 'CUTTING_PLAN'

function toCuttingPlan(spec: EngineeringSpec): CuttingPlan {
  return cuttingPlanSchema.parse({
    ...(spec.cuttingData ?? {}),
    id: spec.id,
    name: spec.cuttingData?.name || spec.name,
    version: spec._v,
    createdAt: spec.createdAt,
  })
}

function toEngineeringSpecInput(plan: CuttingPlanInput, id?: string): EngineeringSpecInput {
  const code = plan.documentNo || plan.productCode || `CUTTING-${Date.now()}`

  return {
    id,
    name: plan.name,
    code,
    type: CUTTING_PLAN_SPEC_TYPE,
    active: plan.status !== 'Archived',
    cuttingData: plan,
    _v: plan.version || 1,
  }
}

export const CuttingPlanService = {
  async list(): Promise<CuttingPlan[]> {
    const specs = await engineeringSpecService.getSpecs(CUTTING_PLAN_SPEC_TYPE)
    return specs.map(toCuttingPlan)
  },

  async save(plan: CuttingPlanInput, id?: string): Promise<CuttingPlan> {
    const saved = await engineeringSpecService.saveSpec(toEngineeringSpecInput(plan, id))
    return toCuttingPlan(saved)
  },

  async remove(id: string): Promise<void> {
    await engineeringSpecService.deleteSpec(id)
  },
}
