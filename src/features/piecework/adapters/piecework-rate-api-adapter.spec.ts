import { describe, expect, it } from 'vitest'
import { ProxyTracker } from '@/lib/delta/proxy-tracker'
import type { DeltaSet } from '@/lib/delta/types'
import contractCases from '../../../../server/services/testdata/piecework_rate_identity_edit_patch_frontend_backend_contract_cases.json'
import {
  toPieceworkRateContract,
  toPieceworkRatePatchApiDTO,
  toPieceworkRateWriteApiDTO,
} from './piecework-rate-api-adapter'

describe('independent payroll rate API adapter', () => {
  it('requires canonical fields and rejects obsolete aliases in responses', () => {
    const canonical = {
      ...contractCases.initialRate,
      status: 'active' as const,
    }
    expect(toPieceworkRateContract(canonical).payItemId).toBe(
      canonical.payItemId
    )
    expect(() =>
      toPieceworkRateContract({ ...canonical, payItemId: '' })
    ).toThrow()
    expect(() =>
      toPieceworkRateContract({ ...canonical, effectiveFrom: '' })
    ).toThrow()
    for (const field of [
      'piecePrice',
      'effectiveAt',
      'productId',
      'processName',
      'isLegacy',
    ]) {
      const obsoleteResponse = { ...canonical, [field]: 'obsolete' }
      expect(() => toPieceworkRateContract(obsoleteResponse)).toThrow()
    }
  })
  it('writes only independent payroll identity and canonical price fields', () => {
    const payload = toPieceworkRateWriteApiDTO({
      id: 'rate',
      payItemId: 'item',
      unit: 'PCS',
      unitPrice: 0,
      currency: 'CNY',
      effectiveFrom: '2026-10-01',
      version: 3,
    })
    expect(payload).toMatchObject({
      id: 'rate',
      payItemId: 'item',
      unitPrice: 0,
      version: 3,
    })
    for (const key of [
      'productId',
      'processStepId',
      'routeStepId',
      'processName',
      'piecePrice',
      'effectiveAt',
    ])
      expect(payload).not.toHaveProperty(key)
  })
  it.each(contractCases.cases)(
    'matches the shared backend SDRTS fixture: $name',
    ({ formUpdates, expectedPayload }) => {
      const initial = toPieceworkRateContract({
        ...contractCases.initialRate,
        status: 'active',
      })
      const tracker = new ProxyTracker(initial)
      for (const update of formUpdates) Object.assign(tracker.data, update)
      const delta = tracker.commit()
      const payload = toPieceworkRatePatchApiDTO(
        initial.id,
        delta,
        initial.version
      )
      expect(JSON.parse(JSON.stringify(payload))).toEqual(expectedPayload)
    }
  )
  it('keeps zero, null and empty strings while projecting the allowlist without mutation', () => {
    const writable: DeltaSet = {
      unitPrice: { o: 2, n: 0 },
      effectiveTo: { o: '2026-10-15', n: null },
      remarks: { o: 'Old', n: '' },
    }
    const delta: DeltaSet = {
      ...writable,
      productId: { o: 'old', n: 'other' },
      payItemName: { o: 'Old', n: 'New' },
      piecePrice: { o: 2, n: 0 },
    }
    const original = structuredClone(delta)
    expect(toPieceworkRatePatchApiDTO('rate', delta, 2)).toEqual({
      op: 'PATCH',
      delta: writable,
      metadata: { id: 'rate', version: 2 },
    })
    expect(delta).toEqual(original)
  })
})
