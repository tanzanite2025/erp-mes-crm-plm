import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClientError } from '@/lib/api-error'
import {
  buildProductionScanCommandApiRequest,
  classifyProductionScanCommandError,
  productionScanCommandService,
  resolveProductionScanCommandSource,
} from './production-scan-command-service'

const apiFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-client', () => ({ apiFetch }))

describe('productionScanCommandService', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  it('normalizes the barcode and maps camera/manual captures to WEB', () => {
    expect(
      buildProductionScanCommandApiRequest({
        productBarcode: ' ab 12 ',
        source: 'camera',
        action: 'complete',
        routeId: ' route-1 ',
      })
    ).toEqual({
      productBarcode: 'AB12',
      action: 'COMPLETE',
      commandSource: 'WEB',
      routeId: 'route-1',
    })
  })

  it('maps hardware captures to USB and preserves explicit PDA source', () => {
    expect(resolveProductionScanCommandSource('hardware')).toBe('USB')
    expect(resolveProductionScanCommandSource('manual', 'PDA')).toBe('PDA')
  })

  it('sends only the production scan command request to the unified endpoint', async () => {
    const response = {
      commandSource: 'PDA',
      operation: {},
      state: {},
      progress: {},
      transferEvents: [],
      message: 'ok',
    }
    apiFetch.mockResolvedValue(response)

    await productionScanCommandService.execute({
      productBarcode: 'PDA-001',
      source: 'manual',
      commandSource: 'PDA',
      action: 'START',
      processStepId: 'process-1',
    })

    expect(apiFetch).toHaveBeenCalledWith('/production/scan-commands/execute', {
      method: 'POST',
      body: JSON.stringify({
        productBarcode: 'PDA-001',
        action: 'START',
        commandSource: 'PDA',
        processStepId: 'process-1',
      }),
    })
  })

  it('classifies validation, forbidden, conflict, network and timeout failures', () => {
    expect(
      classifyProductionScanCommandError(
        createApiClientError({
          kind: 'http',
          message: 'bad request',
          status: 400,
        })
      ).kind
    ).toBe('validation')
    expect(
      classifyProductionScanCommandError(
        createApiClientError({
          kind: 'http',
          message: 'forbidden',
          status: 403,
        })
      ).kind
    ).toBe('forbidden')
    expect(
      classifyProductionScanCommandError(
        createApiClientError({
          kind: 'http',
          message: 'conflict',
          status: 409,
        })
      ).kind
    ).toBe('conflict')
    expect(
      classifyProductionScanCommandError(
        createApiClientError({
          kind: 'network',
          message: 'offline',
        })
      ).kind
    ).toBe('network')
    expect(
      classifyProductionScanCommandError(
        createApiClientError({
          kind: 'timeout',
          message: 'timeout',
        })
      ).kind
    ).toBe('timeout')
  })

  it('rejects an empty barcode before making a request', async () => {
    await expect(
      productionScanCommandService.execute({ productBarcode: '   ' })
    ).rejects.toMatchObject({
      name: 'ProductionScanCommandError',
      kind: 'validation',
    })
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
