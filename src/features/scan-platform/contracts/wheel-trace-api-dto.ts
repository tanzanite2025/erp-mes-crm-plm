import type {
  WheelTraceLookupRequestContract,
  WheelTraceLookupResponseContract,
} from './wheel-trace-gateway-contract'

export interface WheelTraceLookupApiRequestDTO extends WheelTraceLookupRequestContract {
  requestId?: string
  operatorId?: string
  terminalId?: string
  includeResolvedProduct?: boolean
}

export interface WheelTraceStageApiDTO {
  status: 'resolved' | 'partial' | 'unknown'
  lineId?: string
  lineCode?: string
  lineName?: string
  segmentId?: string
  segmentName?: string
  processId?: string
  processCode?: string
  processName?: string
  teamId?: string
  teamName?: string
  operatorId?: string
  operatorName?: string
  scannedAt?: string
}

export interface WheelTraceTimelineNodeApiDTO {
  id: string
  time: string
  title: string
  description: string
  type: 'production' | 'quality' | 'warehouse' | 'logistics' | 'system'
  segmentName?: string
  processName?: string
  operatorName?: string
  status?: string
}

export interface WheelTraceLookupApiResponseDTO {
  rawCode: string
  currentStage: WheelTraceStageApiDTO
  timeline: WheelTraceTimelineNodeApiDTO[]
  warnings: string[]
  meta?: {
    requestId?: string
    source?: string
    generatedAt?: string
  }
}

export function toWheelTraceLookupResponseContract(
  dto: WheelTraceLookupApiResponseDTO
): WheelTraceLookupResponseContract {
  return {
    currentStage: dto.currentStage,
    timeline: dto.timeline,
    warnings: dto.warnings || [],
  }
}
