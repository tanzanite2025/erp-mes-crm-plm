import type {
  ProductionJobCategory,
  ProductionLine,
  ProductionSegment,
  ProductionTopologyTemplate,
} from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'

export type ProcessStep = ProductionProcessStep
export type JobCategory = ProductionJobCategory
export type Segment = ProductionSegment
export type TopologyTemplate = ProductionTopologyTemplate
export type { ProductionLine, ProductionJobCategory, ProductionSegment }
