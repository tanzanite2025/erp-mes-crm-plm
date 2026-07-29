import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import {
  productionScanCommandService,
  type ExecuteProductionScanCommandInput,
} from '@/features/scan-platform/services/production-scan-command-service'
import type { PDAIngestRequest } from './pda-ingest-service'

function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
) {
  const value = metadata?.[key]
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

export function buildPDAProductionScanCommandInput(
  payload: PDAIngestRequest
): ExecuteProductionScanCommandInput {
  const metadata = payload.metadata
  return {
    productBarcode: normalizeMachineCode(payload.rawCode),
    action: readMetadataString(metadata, 'action') || 'START',
    commandSource: 'PDA',
    executionLotId: readMetadataString(metadata, 'executionLotId'),
    routeId: readMetadataString(metadata, 'routeId'),
    routeStepId: readMetadataString(metadata, 'routeStepId'),
    processStepId: readMetadataString(metadata, 'processStepId'),
    targetRouteStepId: readMetadataString(metadata, 'targetRouteStepId'),
    targetProcessStepId: readMetadataString(metadata, 'targetProcessStepId'),
    executionMode: readMetadataString(metadata, 'executionMode'),
    partnerId: readMetadataString(metadata, 'partnerId'),
    result: readMetadataString(metadata, 'result'),
    notes: readMetadataString(metadata, 'notes'),
    fromHolderType: readMetadataString(metadata, 'fromHolderType'),
    fromHolderId: readMetadataString(metadata, 'fromHolderId'),
    toHolderType: readMetadataString(metadata, 'toHolderType'),
    toHolderId: readMetadataString(metadata, 'toHolderId'),
  }
}

export const pdaProductionScanService = {
  async execute(payload: PDAIngestRequest) {
    return productionScanCommandService.execute(
      buildPDAProductionScanCommandInput(payload)
    )
  },
}
