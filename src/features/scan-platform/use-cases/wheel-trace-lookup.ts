import type { ScanResolveInput } from '../core/types'
import type { WheelTracePayload } from '../models/wheel-trace'
import {
  wheelTraceParserService,
  type WheelTraceParserContext,
} from '../services/wheel-trace-parser-service'
import {
  wheelTraceQueryService,
  type WheelTraceLookupRequest,
  type WheelTraceQueryGateway,
} from '../services/wheel-trace-query-service'

export async function runWheelTraceLookup(
  input: ScanResolveInput<WheelTraceParserContext>,
  gateway?: Partial<WheelTraceQueryGateway>
): Promise<WheelTracePayload> {
  const parsed = wheelTraceParserService.parse(input)
  const lookupRequest: WheelTraceLookupRequest = {
    rawCode: input.rawCode.trim().toUpperCase(),
    includeTimeline: true,
  }

  return wheelTraceQueryService.enrichPayload(parsed, lookupRequest, gateway)
}
