import type { DeltaSet } from '@/lib/delta/types'
import type {
  PieceworkRateApiDTO,
  PieceworkRatePatchApiDTO,
  PieceworkRateWriteApiDTO,
} from '../contracts/piecework-rate-api-dto'
import type { PieceworkRate } from '../data/schema'

function normalizeOptionalId(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStatus(value?: string): 'active' | 'inactive' {
  return value?.toLowerCase() === 'inactive' ? 'inactive' : 'active'
}

function normalizeDate(value?: string | null): string {
  return typeof value === 'string' ? value : ''
}

export function toPieceworkRateContract(
  dto: PieceworkRateApiDTO
): PieceworkRate {
  const effectiveFrom = normalizeDate(dto.effectiveFrom || dto.effectiveAt)
  const unitPrice =
    typeof dto.unitPrice === 'number'
      ? dto.unitPrice
      : typeof dto.piecePrice === 'number'
        ? dto.piecePrice
        : 0

  return {
    id: dto.id,
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
    productId: dto.productId || '',
    processStepId: normalizeOptionalId(dto.processStepId),
    routeStepId: normalizeOptionalId(dto.routeStepId),
    processCode: dto.processCode || '',
    processName: dto.processName || '',
    unit: dto.unit || 'PCS',
    unitPrice,
    currency: dto.currency || 'CNY',
    effectiveAt: normalizeDate(dto.effectiveAt || effectiveFrom),
    effectiveFrom,
    effectiveTo: normalizeDate(dto.effectiveTo),
    status: normalizeStatus(dto.status),
    remarks: dto.remarks || '',
    version: Number(dto.version) || 1,
    operator: dto.operator || '',
  }
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
    productId: rate.productId || '',
    ...(rate.processStepId ? { processStepId: rate.processStepId } : {}),
    ...(rate.routeStepId ? { routeStepId: rate.routeStepId } : {}),
    unit: rate.unit || 'PCS',
    unitPrice: rate.unitPrice ?? 0,
    currency: rate.currency || 'CNY',
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
  return {
    op: 'PATCH',
    delta,
    metadata: { id, version },
  }
}
