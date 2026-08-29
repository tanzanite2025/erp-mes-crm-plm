import { describe, expect, it } from 'vitest'
import {
  toPieceworkRateContract,
  toPieceworkRatePatchApiDTO,
  toPieceworkRateWriteApiDTO,
} from './piecework-rate-api-adapter'

describe('piecework rate API adapter', () => {
  it('projects legacy piecePrice and effectiveAt into the canonical contract', () => {
    const result = toPieceworkRateContract({
      id: 'rate-1',
      productId: 'product-1',
      processCode: 'FORMING',
      processName: '成型',
      piecePrice: 2.5,
      effectiveAt: '2026-08-13T00:00:00Z',
    })

    expect(result.unitPrice).toBe(2.5)
    expect(result.effectiveFrom).toBe('2026-08-13T00:00:00Z')
    expect(result.processCode).toBe('FORMING')
  })

  it('writes unitPrice and stable IDs without sending legacy piecePrice', () => {
    const result = toPieceworkRateWriteApiDTO({
      id: 'rate-1',
      productId: 'product-1',
      processStepId: 'process-1',
      routeStepId: 'route-step-1',
      unitPrice: 1.25,
      unit: 'PCS',
      version: 2,
    })

    expect(result).toMatchObject({
      id: 'rate-1',
      productId: 'product-1',
      processStepId: 'process-1',
      routeStepId: 'route-step-1',
      unitPrice: 1.25,
      version: 2,
    })
    expect(result).not.toHaveProperty('piecePrice')
    expect(result).not.toHaveProperty('effectiveAt')
    expect(result).not.toHaveProperty('processCode')
    expect(result).not.toHaveProperty('processName')
  })

  it('builds the canonical SDRTS metadata envelope', () => {
    const result = toPieceworkRatePatchApiDTO(
      'rate-1',
      {
        unitPrice: { o: 1, n: 1.5 },
      },
      3
    )

    expect(result).toEqual({
      op: 'PATCH',
      delta: {
        unitPrice: { o: 1, n: 1.5 },
      },
      metadata: { id: 'rate-1', version: 3 },
    })
  })
})
