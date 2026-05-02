import {
  createEmptyLogisticsProviderDraft,
  LOGISTICS_PROVIDER_PERSISTED_FIELD_KEYS,
} from '@/features/sandbox/logistics-api/data/logistics-provider-field-registry'
import {
  type LogisticsCapability,
  type LogisticsDirectoryCategory,
  type LogisticsProvider,
  type LogisticsProviderDto,
  type LogisticsProviderDraft,
  type LogisticsProviderPayload,
  type LogisticsStatus,
  type LogisticsVerificationStatus,
} from '@/features/sandbox/logistics-api/types'

const allowedCapabilities: LogisticsCapability[] = ['tracking', 'callback', 'label', 'order_create']

export function fromLogisticsProviderDto(dto: LogisticsProviderDto): LogisticsProvider {
  return normalizeLogisticsProviderLike(dto)
}

export function fromLogisticsProviderDtoArray(items: LogisticsProviderDto[]): LogisticsProvider[] {
  return items.map(fromLogisticsProviderDto)
}

export function toLogisticsProviderDraft(source?: Partial<LogisticsProvider> | Partial<LogisticsProviderDraft> | Partial<LogisticsProviderDto>): LogisticsProviderDraft {
  return normalizeLogisticsProviderLike(source)
}

export function toLogisticsProviderPayload(source: LogisticsProviderDraft): LogisticsProviderPayload {
  const normalized = normalizeLogisticsProviderLike(source)

  return {
    id: normalized.id,
    name: normalized.name,
    code: normalized.code,
    category: normalized.category,
    website: normalized.website,
    contact: normalized.contact,
    phone: normalized.phone,
    note: normalized.note,
    appKey: normalized.appKey,
    appSecret: normalized.appSecret,
    customerId: normalized.customerId,
    checkWord: normalized.checkWord,
    endpoint: normalized.endpoint,
    status: normalized.status,
    capabilities: [...normalized.capabilities],
    quotaAlertAt: normalized.quotaAlertAt,
  }
}

function normalizeLogisticsProviderLike(source?: Partial<LogisticsProvider> | Partial<LogisticsProviderDraft> | Partial<LogisticsProviderDto>): LogisticsProviderDraft {
  const base = createEmptyLogisticsProviderDraft()
  const input = source ?? {}

  return {
    ...base,
    id: normalizeOptionalNumber(input.id),
    createdAt: normalizeOptionalString(input.createdAt),
    updatedAt: normalizeOptionalString(input.updatedAt),
    name: normalizeString(input.name),
    code: normalizeCode(input.code),
    category: normalizeCategory(input.category),
    website: normalizeString(input.website),
    contact: normalizeString(input.contact),
    phone: normalizeString(input.phone),
    note: normalizeString(input.note),
    appKey: normalizeString(input.appKey),
    appSecret: normalizeString(input.appSecret),
    customerId: normalizeString(input.customerId),
    checkWord: normalizeString(input.checkWord),
    endpoint: normalizeString(input.endpoint),
    status: normalizeStatus(input.status),
    capabilities: normalizeCapabilities(input.capabilities),
    verificationStatus: normalizeVerificationStatus(input.verificationStatus, input.status),
    lastVerifiedAt: normalizeOptionalString(input.lastVerifiedAt),
    lastVerificationMessage: normalizeString(input.lastVerificationMessage),
    lastVerificationAction: normalizeString(input.lastVerificationAction),
    referenceCount: normalizeCount(input.referenceCount),
    quotaTotal: normalizeNumber(input.quotaTotal, 0),
    quotaUsed: normalizeNumber(input.quotaUsed, 0),
    quotaAlertAt: normalizeNumber(input.quotaAlertAt, base.quotaAlertAt),
  }
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeString(value)
  return normalized === '' ? undefined : normalized
}

function normalizeCode(value: unknown) {
  return normalizeString(value).toUpperCase()
}

function normalizeCategory(value: unknown): LogisticsDirectoryCategory {
  return value === 'international' ? 'international' : 'domestic'
}

function normalizeStatus(value: unknown): LogisticsStatus {
  return value === 'Disabled' ? 'Disabled' : 'Enabled'
}

function normalizeVerificationStatus(value: unknown, status: unknown): LogisticsVerificationStatus {
  if (status === 'Disabled') {
    return 'disabled'
  }

  switch (value) {
    case 'reachable':
    case 'healthy':
    case 'error':
    case 'invalid_config':
    case 'manual_review':
    case 'disabled':
      return value
    default:
      return 'unverified'
  }
}

function normalizeCapabilities(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized = value
    .map((capability) => (typeof capability === 'string' ? capability.trim().toLowerCase() : ''))
    .filter((capability): capability is LogisticsCapability => allowedCapabilities.includes(capability as LogisticsCapability))

  return Array.from(new Set(normalized))
}

function normalizeOptionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function normalizeNumber(value: unknown, fallback: number) {
  const parsed = normalizeOptionalNumber(value)
  return typeof parsed === 'number' ? parsed : fallback
}

function normalizeCount(value: unknown) {
  return normalizeNumber(value, 0)
}

export const logisticsProviderPersistedFieldKeys = [...LOGISTICS_PROVIDER_PERSISTED_FIELD_KEYS]
