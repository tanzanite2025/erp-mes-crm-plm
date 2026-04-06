import type { WheelTraceStageSnapshot, WheelTraceTimelineNode } from '../models/wheel-trace'

export interface WheelTraceLookupRequestContract {
  rawCode: string
  includeTimeline?: boolean
}

export interface WheelTraceLookupResponseContract {
  currentStage: WheelTraceStageSnapshot
  timeline: WheelTraceTimelineNode[]
  warnings: string[]
}
