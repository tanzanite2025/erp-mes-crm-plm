import type { DeltaSet } from '@/lib/delta/types'
import {
  PIECEWORK_RATE_PATCH_WRITABLE_FIELDS,
  type PieceworkRateApiDTO,
  type PieceworkRatePatchApiDTO,
  type PieceworkRateWriteApiDTO,
} from '../contracts/piecework-rate-api-dto'
import { pieceworkRateSchema, type PieceworkRate } from '../data/schema'

export function toPieceworkRateContract(
  dto: PieceworkRateApiDTO
): PieceworkRate {
  return pieceworkRateSchema.parse(dto)
}

export function toPieceworkRateContracts(
  dtos: PieceworkRateApiDTO[]
): PieceworkRate[] {
  return dtos.map(toPieceworkRateContract)
}

export function toPieceworkRateWriteApiDTO(
  rate: Partial<PieceworkRate>
): PieceworkRateWriteApiDTO {
  return {
    ...(rate.id ? { id: rate.id } : {}),
    payItemId: rate.payItemId || '',
    unit: rate.unit,
    unitPrice: rate.unitPrice,
    currency: rate.currency,
    ...(rate.effectiveFrom ? { effectiveFrom: rate.effectiveFrom } : {}),
    ...(rate.effectiveTo ? { effectiveTo: rate.effectiveTo } : {}),
    status: rate.status || 'active',
    ...(rate.remarks ? { remarks: rate.remarks } : {}),
    ...(rate.version ? { version: rate.version } : {}),
  }
}

export function toPieceworkRatePatchApiDTO(
  id: string,
  delta: DeltaSet,
  version: number
): PieceworkRatePatchApiDTO {
  const writableDelta: PieceworkRatePatchApiDTO['delta'] = {}
  for (const field of PIECEWORK_RATE_PATCH_WRITABLE_FIELDS) {
    const change = delta[field]
    if (change !== undefined) writableDelta[field] = change
  }

  return {
    op: 'PATCH',
    delta: writableDelta,
    metadata: { id, version },
  }
}
