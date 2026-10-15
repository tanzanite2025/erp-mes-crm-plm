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
        idempotencyKey: 'camera-command-1',
        productBarcode: ' ab 12 ',
        source: 'camera',
        action: 'complete',
        routeId: ' route-1 ',
      })
    ).toEqual({
      idempotencyKey: 'camera-command-1',
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

  it('does not forward payroll fields from a legacy input to production', () => {
    const input = {
      productBarcode: 'PRODUCTION-ONLY',
      action: 'COMPLETE',
      pieceworkAttribution: { type: 'TEAM', teamId: 'team-one' },
      quantity: 3,
      unitPrice: 2,
    }
    const request = buildProductionScanCommandApiRequest(input)
    expect(request).not.toHaveProperty('pieceworkAttribution')
    expect(request).not.toHaveProperty('quantity')
    expect(request).not.toHaveProperty('unitPrice')
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
      idempotencyKey: 'pda-command-1',
      productBarcode: 'PDA-001',
      source: 'manual',
      commandSource: 'PDA',
      action: 'START',
      processStepId: 'process-1',
    })

    expect(apiFetch).toHaveBeenCalledWith('/production/scan-commands/execute', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: 'pda-command-1',
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

  it.each(['network', 'timeout', 'server'] as const)(
    'keeps the original request key after an ambiguous %s failure',
    async (failureKind) => {
      const input = {
        productBarcode: `RETRY-${failureKind}`,
        action: 'COMPLETE',
      }
      apiFetch.mockRejectedValueOnce(
        createApiClientError({
          kind: failureKind === 'server' ? 'http' : failureKind,
          message: 'ambiguous completion result',
          ...(failureKind === 'server' ? { status: 500 } : {}),
        })
      )
      await expect(
        productionScanCommandService.execute(input)
      ).rejects.toMatchObject({ kind: failureKind })
      const firstRequest = JSON.parse(apiFetch.mock.calls[0][1].body)
      expect(firstRequest.idempotencyKey).toEqual(expect.any(String))

      apiFetch.mockResolvedValueOnce({ message: 'replayed result' })
      await productionScanCommandService.execute(input)
      const retriedRequest = JSON.parse(apiFetch.mock.calls[1][1].body)
      expect(retriedRequest).toEqual(firstRequest)

      apiFetch.mockResolvedValueOnce({ message: 'new command result' })
      await productionScanCommandService.execute(input)
      const newRequest = JSON.parse(apiFetch.mock.calls[2][1].body)
      expect(newRequest.idempotencyKey).not.toBe(firstRequest.idempotencyKey)
    }
  )

  it('coalesces concurrent identical commands into one HTTP request', async () => {
    let resolveRequest!: (value: { message: string }) => void
    apiFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        })
    )
    const input = { productBarcode: 'CONCURRENT-REPLAY', action: 'COMPLETE' }
    const first = productionScanCommandService.execute(input)
    const second = productionScanCommandService.execute(input)
    expect(apiFetch).toHaveBeenCalledTimes(1)
    resolveRequest({ message: 'same response' })
    expect(await first).toEqual(await second)
  })

  it('preserves an explicit caller key and round without coalescing different content', async () => {
    apiFetch.mockResolvedValue({ message: 'ok' })
    const first = productionScanCommandService.execute({
      productBarcode: 'EXPLICIT-REPLAY',
      idempotencyKey: ' explicit-key ',
      executionRound: 2,
      action: 'COMPLETE',
    })
    const second = productionScanCommandService.execute({
      productBarcode: 'EXPLICIT-REPLAY',
      idempotencyKey: 'explicit-key',
      executionRound: 2,
      action: 'REWORK',
    })
    await Promise.all([first, second])
    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      idempotencyKey: 'explicit-key',
      executionRound: 2,
    })
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toMatchObject({
      idempotencyKey: 'explicit-key',
      action: 'REWORK',
    })
  })
})
