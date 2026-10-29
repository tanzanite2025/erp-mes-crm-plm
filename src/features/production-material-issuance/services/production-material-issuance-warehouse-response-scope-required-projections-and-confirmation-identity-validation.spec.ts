import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { productionMaterialIssuanceWarehouseCommandSchema } from '../contracts/production-material-issuance-warehouse-review-batch-availability-and-confirmed-movement-api-dto'
import { createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture } from '../testing/production-material-issuance-warehouse-review-batch-and-movement-test-fixtures'
import {
  confirmProductionMaterialIssuanceWarehouseMovement,
  getProductionMaterialIssuanceMaterialBatchAvailability,
  getProductionMaterialIssuanceWarehouseReview,
  suggestProductionMaterialIssuanceOrdinaryAllocations,
} from './production-material-issuance-warehouse-review-batches-suggestions-and-explicit-confirmation-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
beforeEach(() => vi.mocked(apiFetch).mockReset())

describe('warehouse API response and explicit command boundaries', () => {
  it('requires the return projection and rejects foreign document identities', async () => {
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    vi.mocked(apiFetch).mockResolvedValue(fixture.issuedReview)
    expect(
      (await getProductionMaterialIssuanceWarehouseReview(fixture.document.id))
        .returnableAllocations
    ).toHaveLength(1)
    const legacy = { ...fixture.review, returnableAllocations: undefined }
    vi.mocked(apiFetch).mockResolvedValue(legacy)
    await expect(
      getProductionMaterialIssuanceWarehouseReview(fixture.document.id)
    ).rejects.toThrow()
    vi.mocked(apiFetch).mockResolvedValue({
      ...fixture.review,
      document: { ...fixture.document, id: fixture.basis.productId },
    })
    await expect(
      getProductionMaterialIssuanceWarehouseReview(fixture.document.id)
    ).rejects.toThrow('different document')
  })

  it('rejects stale versions, foreign batches, duplicate balances and allocation suggestions', async () => {
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    const input = {
      documentId: fixture.document.id,
      expectedVersion: 1,
      materialId: fixture.materialId,
    }
    for (const response of [
      { ...fixture.batches, expectedVersion: 2 },
      {
        ...fixture.batches,
        items: [{ ...fixture.batches.items[0], categoryCode: 'OTHER' }],
      },
      {
        ...fixture.batches,
        items: [...fixture.batches.items, ...fixture.batches.items],
      },
    ]) {
      vi.mocked(apiFetch).mockResolvedValue(response)
      await expect(
        getProductionMaterialIssuanceMaterialBatchAvailability(input)
      ).rejects.toThrow()
    }
    vi.mocked(apiFetch).mockResolvedValue({
      ...fixture.suggestion,
      materialId: fixture.basis.productId,
    })
    await expect(
      suggestProductionMaterialIssuanceOrdinaryAllocations({
        ...input,
        quantity: 10,
      })
    ).rejects.toThrow('different scope')
  })

  it('sends only the explicit command and verifies actor, action, quantity and original version while allowing replay', async () => {
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    const command = {
      documentId: fixture.document.id,
      expectedVersion: 1,
      commandId: '12345678-1234-4234-8234-123456789012',
      action: 'issue' as const,
      reason: '',
      materials: [
        {
          materialId: fixture.materialId,
          batchNo: 'batch-A',
          quantity: 10,
          allocations: fixture.suggestion.allocations,
        },
      ],
    }
    vi.mocked(apiFetch).mockResolvedValue({
      ...fixture.result,
      document: { ...fixture.result.document, version: 5 },
    })
    await expect(
      confirmProductionMaterialIssuanceWarehouseMovement(command, 'warehouse-1')
    ).resolves.toMatchObject({ document: { version: 5 } })
    const body = JSON.parse(String(vi.mocked(apiFetch).mock.calls[0][1]?.body))
    expect(Object.keys(body).sort()).toEqual([
      'commandId',
      'expectedVersion',
      'materials',
      'reason',
    ])
    for (const changed of [
      { confirmedBy: 'someone-else' },
      { kind: 'SUPPLEMENT' },
      { documentVersionAfter: 3 },
    ]) {
      vi.mocked(apiFetch).mockResolvedValue({
        ...fixture.result,
        movement: {
          ...fixture.result.movement,
          movement: { ...fixture.result.movement.movement, ...changed },
        },
      })
      await expect(
        confirmProductionMaterialIssuanceWarehouseMovement(
          command,
          'warehouse-1'
        )
      ).rejects.toThrow('different command result')
    }
    expect(
      productionMaterialIssuanceWarehouseCommandSchema.safeParse({
        ...command,
        materials: [{ ...command.materials[0], quantity: 11 }],
      }).success
    ).toBe(false)
    expect(
      productionMaterialIssuanceWarehouseCommandSchema.safeParse({
        ...command,
        action: 'return',
      }).success
    ).toBe(false)
  })
})
