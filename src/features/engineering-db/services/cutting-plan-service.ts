import {
  engineeringSpecService,
  type EngineeringSpec,
  type EngineeringSpecInput,
} from '@/features/engineering/services/engineering-spec-service'
import { ZodError } from 'zod'
import { createLogger } from '@/lib/logger'
import {
  cuttingPlanSchema,
  prepareCuttingPlanForPersistence,
  type CuttingPlan,
  type CuttingPlanInput,
} from '../data/cutting-plan-schema'
import type { CutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'

const CUTTING_PLAN_SPEC_TYPE = 'CUTTING_PLAN'
const logger = createLogger('CuttingPlanService')

export type InvalidCuttingPlanFailureType =
  | 'missing_required_fields'
  | 'invalid_lines'
  | 'schema_mismatch'
  | 'unknown_invalid_payload'

export interface InvalidCuttingPlanSummary {
  specId: string
  specCode: string
  displayName: string
  failureType: InvalidCuttingPlanFailureType
  failureLabel: string
  reason: string
}

export interface CuttingPlanListReadModel {
  items: CuttingPlan[]
  invalidItems: InvalidCuttingPlanSummary[]
}

function toCuttingPlan(spec: EngineeringSpec): CuttingPlan {
  return cuttingPlanSchema.parse({
    ...(spec.cuttingData ?? {}),
    id: spec.id,
    name: spec.cuttingData?.name || spec.name,
    version: spec._v,
    createdAt: spec.createdAt,
  })
}

function extractDisplayName(spec: EngineeringSpec): string {
  const payload = spec.cuttingData
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const rawName = payload.name
    if (typeof rawName === 'string' && rawName.trim()) {
      return rawName.trim()
    }
  }

  return spec.name?.trim() || spec.code?.trim() || spec.id
}

function summarizeInvalidCuttingPlanReason(error: unknown): string {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0]
    if (!firstIssue) {
      return 'Invalid cutting plan payload'
    }

    const path = firstIssue.path.map((segment) => String(segment)).join('.')
    return path ? `${path}: ${firstIssue.message}` : firstIssue.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }

  return 'Unknown invalid cutting plan payload'
}

function classifyInvalidCuttingPlanFailure(error: unknown): {
  failureType: InvalidCuttingPlanFailureType
  failureLabel: string
} {
  if (error instanceof ZodError) {
    const paths = error.issues.map((issue) => issue.path.map((segment) => String(segment)).join('.'))

    if (paths.some((path) => path === 'lines' || path.startsWith('lines.'))) {
      return {
        failureType: 'invalid_lines',
        failureLabel: 'Invalid lines',
      }
    }

    if (
      paths.some((path) =>
        ['name', 'productId', 'productCode', 'productName', 'holeCount', 'status'].includes(path),
      )
    ) {
      return {
        failureType: 'missing_required_fields',
        failureLabel: 'Missing required fields',
      }
    }

    return {
      failureType: 'schema_mismatch',
      failureLabel: 'Schema mismatch',
    }
  }

  return {
    failureType: 'unknown_invalid_payload',
    failureLabel: 'Unknown invalid payload',
  }
}

function toInvalidCuttingPlanSummary(spec: EngineeringSpec, error: unknown): InvalidCuttingPlanSummary {
  const { failureType, failureLabel } = classifyInvalidCuttingPlanFailure(error)
  const reason = summarizeInvalidCuttingPlanReason(error)

  return {
    specId: spec.id,
    specCode: spec.code?.trim() || '--',
    displayName: extractDisplayName(spec),
    failureType,
    failureLabel,
    reason,
  }
}

function safeToCuttingPlan(spec: EngineeringSpec): CuttingPlan | InvalidCuttingPlanSummary {
  try {
    return toCuttingPlan(spec)
  } catch (error) {
    const summary = toInvalidCuttingPlanSummary(spec, error)
    logger.warn('Skipped invalid cutting plan record during list parsing', {
      specId: spec.id,
      specCode: spec.code,
      displayName: summary.displayName,
      failureType: summary.failureType,
      reason: summary.reason,
      error,
    })
    return summary
  }
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
  async listReadModel(): Promise<CuttingPlanListReadModel> {
    const specs = await engineeringSpecService.getSpecs(CUTTING_PLAN_SPEC_TYPE)
    const items: CuttingPlan[] = []
    const invalidItems: InvalidCuttingPlanSummary[] = []

    specs.forEach((spec) => {
      const parsed = safeToCuttingPlan(spec)
      if ('lines' in parsed) {
        items.push(parsed)
        return
      }

      invalidItems.push(parsed)
    })

    return {
      items,
      invalidItems,
    }
  },

  async list(): Promise<CuttingPlan[]> {
    const result = await this.listReadModel()
    return result.items
  },

  async save(plan: CuttingPlanInput, options: { id?: string; cutSizeUnits: CutSizeUnit[] }): Promise<CuttingPlan> {
    const prepared = prepareCuttingPlanForPersistence(plan, options.cutSizeUnits)
    const saved = await engineeringSpecService.saveSpec(toEngineeringSpecInput(prepared, options.id))
    return toCuttingPlan(saved)
  },

  async remove(id: string): Promise<void> {
    await engineeringSpecService.deleteSpec(id)
  },
}
