import type {
  ProductionLine,
  ProductionLineSegment,
  ProductionSegment,
  ProductionTopologyTemplate,
} from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'

export type ProcessStep = ProductionProcessStep
export type Segment = ProductionSegment
export type TopologyTemplate = ProductionTopologyTemplate
export type { ProductionLine, ProductionLineSegment, ProductionSegment }
