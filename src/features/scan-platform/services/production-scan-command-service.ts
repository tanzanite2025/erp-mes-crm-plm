import { apiFetch } from '@/lib/api-client'
import { createApiClientError, isApiClientError } from '@/lib/api-error'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import type {
  ProductionScanCommandAction,
  ProductionScanCommandApiRequestDTO,
  ProductionScanCommandApiResponseDTO,
  ProductionScanCommandSource,
} from '../contracts/production-scan-command-api-dto'
import type { ScanCaptureSource } from '../core/types'
import {
  prepareProductionScanCommandRequestForRetry,
  releaseCompletedProductionScanCommandRetryKey,
} from './production-scan-command-request-retry-tracker'

export const PRODUCTION_SCAN_COMMAND_ENDPOINT =
  '/production/scan-commands/execute'

export interface ExecuteProductionScanCommandInput {
  idempotencyKey?: string
  executionRound?: number
  productBarcode: string
  executionLotId?: string
  routeId?: string
  routeStepId?: string
  processStepId?: string
  targetRouteStepId?: string
  targetProcessStepId?: string
  executionMode?: string
  partnerId?: string
  action?: ProductionScanCommandAction | string
  result?: string
  notes?: string
  source?: ScanCaptureSource
  commandSource?: ProductionScanCommandSource
  fromHolderType?: string
  fromHolderId?: string
  toHolderType?: string
  toHolderId?: string
}

export type ProductionScanCommandErrorKind =
  | 'validation'
  | 'forbidden'
  | 'conflict'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown'

export interface ProductionScanCommandError extends Error {
  name: 'ProductionScanCommandError'
  kind: ProductionScanCommandErrorKind
  status?: number
  code?: unknown
  cause?: unknown
}

const REQUEST_FIELD_NAMES = [
  'executionLotId',
  'routeId',
  'routeStepId',
  'processStepId',
  'targetRouteStepId',
  'targetProcessStepId',
  'executionMode',
  'partnerId',
  'result',
  'notes',
  'fromHolderType',
  'fromHolderId',
  'toHolderType',
  'toHolderId',
] as const

function normalizeOptionalValue(value?: string) {
  const normalized = value?.trim()
  return normalized || undefined
}

export function resolveProductionScanCommandSource(
  source?: ScanCaptureSource,
  commandSource?: ProductionScanCommandSource
): ProductionScanCommandSource {
  if (commandSource) return commandSource
  return source === 'hardware' ? 'USB' : 'WEB'
}

export function buildProductionScanCommandApiRequest(
  input: ExecuteProductionScanCommandInput
): ProductionScanCommandApiRequestDTO {
  const action = (input.action || 'START').trim().toUpperCase() as
    | ProductionScanCommandAction
    | string
  const request: ProductionScanCommandApiRequestDTO = {
    idempotencyKey:
      input.idempotencyKey?.trim() || globalThis.crypto.randomUUID(),
    ...(input.executionRound !== undefined
      ? { executionRound: input.executionRound }
      : {}),
    productBarcode: normalizeMachineCode(input.productBarcode),
    action: action as ProductionScanCommandAction,
    commandSource: resolveProductionScanCommandSource(
      input.source,
      input.commandSource
    ),
  }

  for (const field of REQUEST_FIELD_NAMES) {
    const value = normalizeOptionalValue(input[field])
    if (value) {
      request[field] = value
    }
  }

  return request
}

function createProductionScanCommandError(
  error: unknown
): ProductionScanCommandError {
  const status =
    isApiClientError(error) && Number.isFinite(error.status)
      ? error.status
      : undefined
  const kind: ProductionScanCommandErrorKind = isApiClientError(error)
    ? error.kind === 'network'
      ? 'network'
      : error.kind === 'timeout'
        ? 'timeout'
        : status === 400
          ? 'validation'
          : status === 403
            ? 'forbidden'
            : status === 409
              ? 'conflict'
              : status !== undefined && status >= 500
                ? 'server'
                : 'unknown'
    : 'unknown'
  const message =
    error instanceof Error ? error.message : 'Production scan command failed'
  const normalized = new Error(message) as ProductionScanCommandError
  normalized.name = 'ProductionScanCommandError'
  normalized.kind = kind
  normalized.status = status
  normalized.code = isApiClientError(error) ? error.code : undefined
  normalized.cause = error
  return normalized
}

export function classifyProductionScanCommandError(
  error: unknown
): ProductionScanCommandError {
  if (
    error instanceof Error &&
    error.name === 'ProductionScanCommandError' &&
    'kind' in error
  ) {
    return error as ProductionScanCommandError
  }
  return createProductionScanCommandError(error)
}

const inFlightProductionScanCommands = new Map<
  string,
  Promise<ProductionScanCommandApiResponseDTO>
>()

export const productionScanCommandService = {
  async execute(
    input: ExecuteProductionScanCommandInput
  ): Promise<ProductionScanCommandApiResponseDTO> {
    const builtRequest = buildProductionScanCommandApiRequest(input)
    if (!builtRequest.productBarcode) {
      throw classifyProductionScanCommandError(
        createApiClientError({
          kind: 'http',
          message: 'productBarcode is required',
          status: 400,
        })
      )
    }

    const request = prepareProductionScanCommandRequestForRetry(
      builtRequest,
      Boolean(input.idempotencyKey?.trim())
    )
    const requestKey = JSON.stringify(request)
    const existingRequest = inFlightProductionScanCommands.get(requestKey)
    if (existingRequest) return existingRequest

    const execution = apiFetch<ProductionScanCommandApiResponseDTO>(
      PRODUCTION_SCAN_COMMAND_ENDPOINT,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )
      .then((response) => {
        releaseCompletedProductionScanCommandRetryKey(request)
        return response
      })
      .catch((error: unknown) => {
        const normalized = classifyProductionScanCommandError(error)
        if (['validation', 'forbidden', 'conflict'].includes(normalized.kind)) {
          releaseCompletedProductionScanCommandRetryKey(request)
        }
        throw normalized
      })
      .finally(() => inFlightProductionScanCommands.delete(requestKey))
    inFlightProductionScanCommands.set(requestKey, execution)
    return execution
  },
}
