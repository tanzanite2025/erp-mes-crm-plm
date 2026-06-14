import { createEmptyLogisticsProviderDraft } from '@/features/sandbox/logistics-api/data/logistics-provider-field-registry'
import {
  isLogisticsProviderCredentialsComplete,
  supportsAutomaticLogisticsVerification,
} from '@/features/sandbox/logistics-api/data/logistics-provider-rules'
import {
  LOGISTICS_TEMPLATES,
  type LogisticsDirectoryCategory,
  type LogisticsProviderDraft,
  type LogisticsProvider,
  type LogisticsTemplate,
  type LogisticsVerificationStatus,
} from '@/features/sandbox/logistics-api/types'

export const logisticsProviderQueryKey = ['logistics-push-providers'] as const

export const emptyLogisticsProvider: LogisticsProviderDraft =
  createEmptyLogisticsProviderDraft()

export function createEmptyLogisticsProvider() {
  return createEmptyLogisticsProviderDraft()
}

function normalizeValue(value?: string) {
  return (value || '').trim().toLowerCase()
}

export function getProviderCategory(
  provider: LogisticsProvider
): LogisticsDirectoryCategory {
  return provider.category === 'international' ? 'international' : 'domestic'
}

export function findLogisticsTemplateByCode(
  code?: string
): LogisticsTemplate | undefined {
  const normalizedCode = (code || '').trim().toUpperCase()
  if (!normalizedCode) return undefined
  return LOGISTICS_TEMPLATES.find(
    (template) => template.code === normalizedCode
  )
}

export function applyLogisticsTemplate(
  base: LogisticsProvider,
  code: string
): LogisticsProvider {
  const template = findLogisticsTemplateByCode(code)
  if (!template) return base

  return {
    ...base,
    name: template.name,
    code: template.code,
    category: template.category,
    website: template.website,
    contact: base.contact?.trim() ? base.contact : template.contact,
    phone: base.phone?.trim() ? base.phone : template.phone,
    note: base.note?.trim() ? base.note : template.note,
    endpoint: template.endpoint,
    capabilities: template.capabilities,
  }
}

export function hasProviderCredentials(provider: LogisticsProvider) {
  return isLogisticsProviderCredentialsComplete(provider)
}

export function supportsProviderAutomaticVerification(
  provider: Pick<LogisticsProvider, 'code'>
) {
  return supportsAutomaticLogisticsVerification(provider)
}

export function getProviderCapabilities(provider: LogisticsProvider) {
  if (provider.capabilities?.length) {
    return provider.capabilities
  }

  return findLogisticsTemplateByCode(provider.code)?.capabilities || []
}

export function toggleProviderCapability(
  provider: LogisticsProvider,
  capability: NonNullable<LogisticsProvider['capabilities']>[number]
) {
  const current = new Set(getProviderCapabilities(provider))
  if (current.has(capability)) {
    current.delete(capability)
  } else {
    current.add(capability)
  }

  return {
    ...provider,
    capabilities: Array.from(current),
  }
}

export function isProviderApiConnected(provider: LogisticsProvider) {
  return (
    provider.status === 'Enabled' &&
    hasProviderCredentials(provider) &&
    (supportsProviderAutomaticVerification(provider) ||
      Boolean(provider.endpoint?.trim()))
  )
}

export function getProviderVerificationStatus(
  provider: LogisticsProvider
): LogisticsVerificationStatus {
  if (provider.status === 'Disabled') {
    return 'disabled'
  }

  return provider.verificationStatus || 'unverified'
}

export function findDuplicateProvider(
  providers: LogisticsProvider[],
  candidate: LogisticsProvider
) {
  const normalizedCode = (candidate.code || '').trim().toUpperCase()
  const normalizedName = normalizeValue(candidate.name)

  return providers.find((provider) => {
    if (provider.id && candidate.id && provider.id === candidate.id) {
      return false
    }

    const providerCode = (provider.code || '').trim().toUpperCase()
    const providerName = normalizeValue(provider.name)

    return (
      (normalizedCode !== '' && providerCode === normalizedCode) ||
      (normalizedName !== '' && providerName === normalizedName)
    )
  })
}
