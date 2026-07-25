import { apiFetch } from '@/lib/api-client'
import {
  type LinearBarcodeStatusContract,
  type LinearBarcodeStatusDefinition,
  type LinearBarcodeStatusDefinitionKind,
  type LinearBarcodeStatusDefinitionTone,
  type LinearBarcodeProductionLocationAnchor,
  type LinearBarcodeStatusWritePolicy,
} from '@/features/code-center/data/linear-barcode-status-definitions'

export const LINEAR_BARCODE_STATUS_CONTRACT_QUERY_KEY = [
  'code-center',
  'linear-barcode',
  'status-contract',
] as const

interface LinearBarcodeStatusDefinitionApiDTO {
  code?: string
  kind?: string
  phase?: string
  trigger?: string
  sourceTable?: string
  tone?: string
  isTerminal?: boolean
}

interface LinearBarcodeProductionLocationAnchorApiDTO {
  code?: string
  field?: string
  sourceTable?: string
  required?: boolean
}

interface LinearBarcodeStatusWritePolicyApiDTO {
  code?: string
  description?: string
}

interface LinearBarcodeStatusContractApiDTO {
  inventoryStatuses?: LinearBarcodeStatusDefinitionApiDTO[]
  productionStatuses?: LinearBarcodeStatusDefinitionApiDTO[]
  productionLocationAnchors?: LinearBarcodeProductionLocationAnchorApiDTO[]
  writePolicies?: LinearBarcodeStatusWritePolicyApiDTO[]
}

function normalizeLinearBarcodeStatusDefinitionKind(
  value: unknown
): LinearBarcodeStatusDefinitionKind {
  return value === 'production' ? 'production' : 'inventory'
}

function normalizeLinearBarcodeStatusDefinitionTone(
  value: unknown
): LinearBarcodeStatusDefinitionTone {
  switch (value) {
    case 'success':
    case 'info':
    case 'warning':
    case 'danger':
    case 'accent':
    case 'neutral':
      return value
    default:
      return 'neutral'
  }
}

function normalizeLinearBarcodeStatusDefinition(
  dto: LinearBarcodeStatusDefinitionApiDTO
): LinearBarcodeStatusDefinition {
  return {
    code: String(dto.code ?? '').trim(),
    kind: normalizeLinearBarcodeStatusDefinitionKind(dto.kind),
    phase: String(dto.phase ?? '').trim(),
    trigger: String(dto.trigger ?? '').trim(),
    sourceTable: String(dto.sourceTable ?? '').trim(),
    tone: normalizeLinearBarcodeStatusDefinitionTone(dto.tone),
    isTerminal: Boolean(dto.isTerminal),
  }
}

function normalizeLinearBarcodeProductionLocationAnchor(
  dto: LinearBarcodeProductionLocationAnchorApiDTO
): LinearBarcodeProductionLocationAnchor {
  return {
    code: String(dto.code ?? '').trim(),
    field: String(dto.field ?? '').trim(),
    sourceTable: String(dto.sourceTable ?? '').trim(),
    required: Boolean(dto.required),
  }
}

function normalizeLinearBarcodeStatusWritePolicy(
  dto: LinearBarcodeStatusWritePolicyApiDTO
): LinearBarcodeStatusWritePolicy {
  return {
    code: String(dto.code ?? '').trim(),
    description: String(dto.description ?? '').trim(),
  }
}

function normalizeLinearBarcodeStatusContract(
  dto: LinearBarcodeStatusContractApiDTO
): LinearBarcodeStatusContract {
  return {
    inventoryStatuses: (dto.inventoryStatuses ?? [])
      .map(normalizeLinearBarcodeStatusDefinition)
      .filter((definition) => definition.code !== ''),
    productionStatuses: (dto.productionStatuses ?? [])
      .map(normalizeLinearBarcodeStatusDefinition)
      .filter((definition) => definition.code !== ''),
    productionLocationAnchors: (dto.productionLocationAnchors ?? [])
      .map(normalizeLinearBarcodeProductionLocationAnchor)
      .filter((anchor) => anchor.code !== '' && anchor.field !== ''),
    writePolicies: (dto.writePolicies ?? [])
      .map(normalizeLinearBarcodeStatusWritePolicy)
      .filter((policy) => policy.code !== ''),
  }
}

export const linearBarcodeStatusContractService = {
  async getContract(): Promise<LinearBarcodeStatusContract> {
    const response = await apiFetch<LinearBarcodeStatusContractApiDTO>(
      '/code-center/linear-barcode/status-contract'
    )

    return normalizeLinearBarcodeStatusContract(response)
  },
}
