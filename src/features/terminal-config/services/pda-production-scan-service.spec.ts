import { describe, expect, it, vi } from 'vitest'
import {
  pdaProductionScanService,
  buildPDAProductionScanCommandInput,
} from './pda-production-scan-service'

const execute = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/scan-platform/services/production-scan-command-service',
  () => ({
    productionScanCommandService: { execute },
  })
)

describe('pdaProductionScanService', () => {
  it('builds a PDA production command without routing it through PDA ingest', () => {
    expect(
      buildPDAProductionScanCommandInput({
        rawCode: ' pda-001 ',
        scene: 'production',
        metadata: {
          routeId: 'route-1',
          processStepId: 'process-1',
          action: 'START',
        },
      })
    ).toEqual({
      productBarcode: 'PDA-001',
      action: 'START',
      commandSource: 'PDA',
      routeId: 'route-1',
      processStepId: 'process-1',
    })
  })

  it('delegates only to the unified production scan command service', async () => {
    execute.mockResolvedValue({ message: 'ok' })

    await pdaProductionScanService.execute({
      rawCode: 'PDA-002',
      scene: 'production',
    })

    expect(execute).toHaveBeenCalledWith({
      productBarcode: 'PDA-002',
      action: 'START',
      commandSource: 'PDA',
      executionLotId: undefined,
      routeId: undefined,
      routeStepId: undefined,
      processStepId: undefined,
      targetRouteStepId: undefined,
      targetProcessStepId: undefined,
      executionMode: undefined,
      partnerId: undefined,
      result: undefined,
      notes: undefined,
      fromHolderType: undefined,
      fromHolderId: undefined,
      toHolderType: undefined,
      toHolderId: undefined,
    })
  })
})
