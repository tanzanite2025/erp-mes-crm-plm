import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture } from '../testing/production-material-issuance-reviewed-source-and-frozen-document-test-fixtures'
import {
  dispatchProductionMaterialIssuanceReviewedBasis,
  withdrawProductionMaterialIssuanceDocumentWithVersion,
} from './production-material-issuance-reviewed-dispatch-and-versioned-withdrawal-command-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
beforeEach(() => vi.mocked(apiFetch).mockReset())

function createProductionMaterialIssuanceCommandServiceTestRequests() {
  const fixture =
    createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
  return {
    fixture,
    dispatch: {
      commandId: '77777777-7777-4777-8777-777777777777',
      sources: [
        {
          ...fixture.selection,
          expectedOrderVersion: 4,
          expectedBomVersion: 3,
          basisFingerprint: 'a'.repeat(64),
        },
      ],
    },
    withdraw: {
      commandId: '88888888-8888-4888-8888-888888888888',
      documentId: fixture.document.id,
      expectedVersion: 1,
      reason: '重新核对重量',
    },
  }
}

describe('production material dispatch and withdrawal API command contracts', () => {
  it('sends only identities, expected versions and the reviewed fingerprint, and accepts a withdrawn original on replay', async () => {
    const { fixture, dispatch } =
      createProductionMaterialIssuanceCommandServiceTestRequests()
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(fixture.detail)
      .mockResolvedValueOnce(fixture.withdrawnDetail)
    expect(
      await dispatchProductionMaterialIssuanceReviewedBasis(dispatch)
    ).toEqual(fixture.detail)
    expect(apiFetch).toHaveBeenLastCalledWith(
      '/mrp/production-material-issuance/dispatch',
      { method: 'POST', body: JSON.stringify(dispatch) }
    )
    expect(
      await dispatchProductionMaterialIssuanceReviewedBasis(dispatch)
    ).toEqual(fixture.withdrawnDetail)
  })

  it('rejects missing, duplicate or forged command fields before requesting', async () => {
    const { dispatch, withdraw } =
      createProductionMaterialIssuanceCommandServiceTestRequests()
    for (const invalid of [
      { ...dispatch, commandId: '' },
      { ...dispatch, sources: [] },
      { ...dispatch, sources: [dispatch.sources[0], dispatch.sources[0]] },
      {
        ...dispatch,
        sources: [{ ...dispatch.sources[0], expectedOrderVersion: 0 }],
      },
      {
        ...dispatch,
        sources: [{ ...dispatch.sources[0], basisFingerprint: 'bad' }],
      },
      { ...dispatch, actorId: 'forged' },
      { ...dispatch, quantity: 9999 },
    ])
      await expect(
        dispatchProductionMaterialIssuanceReviewedBasis(invalid)
      ).rejects.toThrow()
    for (const invalid of [
      { ...withdraw, reason: ' ' },
      { ...withdraw, reason: '重'.repeat(667) },
      { ...withdraw, documentId: '../another-document' },
      { ...withdraw, expectedVersion: 0 },
    ])
      await expect(
        withdrawProductionMaterialIssuanceDocumentWithVersion(invalid)
      ).rejects.toThrow()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('rejects foreign or changed frozen bases instead of reporting successful dispatch', async () => {
    const { fixture, dispatch } =
      createProductionMaterialIssuanceCommandServiceTestRequests()
    for (const basis of [
      { ...fixture.basis, salesOrderLineId: 999 },
      { ...fixture.basis, salesOrderId: fixture.basis.productId },
      { ...fixture.basis, orderVersion: 5 },
      { ...fixture.basis, bom: { ...fixture.basis.bom, version: 4 } },
      { ...fixture.basis, basisFingerprint: 'b'.repeat(64) },
    ]) {
      vi.mocked(apiFetch).mockResolvedValue({
        ...fixture.detail,
        sources: [basis],
      })
      await expect(
        dispatchProductionMaterialIssuanceReviewedBasis(dispatch)
      ).rejects.toThrow('different frozen basis')
    }
  })

  it('takes withdrawal identity from the URL and checks the returned status, version and reason', async () => {
    const { fixture, withdraw } =
      createProductionMaterialIssuanceCommandServiceTestRequests()
    vi.mocked(apiFetch).mockResolvedValue(fixture.withdrawnDetail)
    expect(
      await withdrawProductionMaterialIssuanceDocumentWithVersion({
        ...withdraw,
        reason: ` ${withdraw.reason} `,
      })
    ).toEqual(fixture.withdrawnDetail)
    expect(apiFetch).toHaveBeenLastCalledWith(
      `/mrp/production-material-issuance/documents/${fixture.document.id}/withdraw`,
      {
        method: 'POST',
        body: JSON.stringify({
          commandId: withdraw.commandId,
          expectedVersion: 1,
          reason: withdraw.reason,
        }),
      }
    )
    for (const document of [
      fixture.document,
      { ...fixture.withdrawnDetail.document, id: fixture.basis.salesOrderId },
      { ...fixture.withdrawnDetail.document, version: 3 },
      { ...fixture.withdrawnDetail.document, withdrawalReason: '另一原因' },
    ]) {
      vi.mocked(apiFetch).mockResolvedValue({
        ...fixture.withdrawnDetail,
        document,
      })
      await expect(
        withdrawProductionMaterialIssuanceDocumentWithVersion(withdraw)
      ).rejects.toThrow()
    }
  })
})
