import type { WheelTracePayload, WheelTraceStageSnapshot, WheelTraceTimelineNode } from '../models/wheel-trace'

export interface WheelTraceLookupRequest {
  rawCode: string
  includeTimeline?: boolean
}

export interface WheelTraceLookupResponse {
  currentStage: WheelTraceStageSnapshot
  timeline: WheelTraceTimelineNode[]
  warnings: string[]
}

export interface WheelTraceQueryGateway {
  lookup: (request: WheelTraceLookupRequest) => Promise<WheelTraceLookupResponse>
}

async function defaultLookup(): Promise<WheelTraceLookupResponse> {
  return {
    currentStage: {
      status: 'unknown',
    },
    timeline: [],
    warnings: ['追溯查询接口尚未接入，当前仅返回条码解析结果。'],
  }
}

export const wheelTraceQueryService = {
  createGateway(gateway?: Partial<WheelTraceQueryGateway>): WheelTraceQueryGateway {
    return {
      lookup: gateway?.lookup || defaultLookup,
    }
  },

  async enrichPayload(
    payload: Pick<WheelTracePayload, 'summary' | 'barcode' | 'identity' | 'warnings'>,
    request: WheelTraceLookupRequest,
    gateway?: Partial<WheelTraceQueryGateway>
  ): Promise<WheelTracePayload> {
    const client = this.createGateway(gateway)
    const lookup = await client.lookup(request)

    return {
      ...payload,
      currentStage: lookup.currentStage,
      timeline: lookup.timeline,
      warnings: [...payload.warnings, ...lookup.warnings],
    }
  },
}
