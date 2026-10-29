import type { z } from 'zod'
import type {
  materialRequirementSchema,
  mrpRequirementStatsSchema,
} from '../contracts/production-material-requirement-analysis-api-dto'

export type MaterialRequirement = z.infer<typeof materialRequirementSchema>
export type MrpStats = z.infer<typeof mrpRequirementStatsSchema>
