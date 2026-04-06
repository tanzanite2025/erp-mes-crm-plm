import { apiFetch } from '@/lib/api-client'
import type {
  WheelTraceLookupApiRequestDTO,
  WheelTraceLookupApiResponseDTO,
} from '../../contracts/wheel-trace-api-dto'
import { toWheelTraceLookupResponseContract } from '../../contracts/wheel-trace-api-dto'
import type { WheelTraceQueryGateway, WheelTraceLookupRequest } from '../../services/wheel-trace-query-service'

export interface WheelTraceApiGatewayOptions {
  endpoint?: string
  operatorId?: string
  terminalId?: string
  includeResolvedProduct?: boolean
  requestIdFactory?: () => string
}

const DEFAULT_WHEEL_TRACE_LOOKUP_ENDPOINT = '/trace/wheel/lookup'

function createRequestId() {
  return `wheel-trace-${Date.now()}`
}

export function buildWheelTraceLookupApiRequestDTO(
  request: WheelTraceLookupRequest,
  options: WheelTraceApiGatewayOptions = {}
): WheelTraceLookupApiRequestDTO {
  return {
    rawCode: request.rawCode.trim().toUpperCase(),
    includeTimeline: request.includeTimeline ?? true,
    requestId: options.requestIdFactory?.() || createRequestId(),
    operatorId: options.operatorId,
    terminalId: options.terminalId,
    includeResolvedProduct: options.includeResolvedProduct ?? true,
  }
}

export function createWheelTraceApiGateway(
  options: WheelTraceApiGatewayOptions = {}
): WheelTraceQueryGateway {
  const endpoint = options.endpoint || DEFAULT_WHEEL_TRACE_LOOKUP_ENDPOINT

  return {
    async lookup(request) {
      const dto = buildWheelTraceLookupApiRequestDTO(request, options)
      const response = await apiFetch<WheelTraceLookupApiResponseDTO>(endpoint, {
        method: 'POST',
        body: JSON.stringify(dto),
      })

      return toWheelTraceLookupResponseContract(response)
    },
  }
}
