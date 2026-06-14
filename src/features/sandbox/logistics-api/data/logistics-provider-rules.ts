import {
  LOGISTICS_PROVIDER_CREDENTIAL_FIELD_KEYS,
  type LogisticsProviderFieldKey,
} from '@/features/sandbox/logistics-api/data/logistics-provider-field-registry'
import type {
  LogisticsProvider,
  LogisticsProviderDraft,
} from '@/features/sandbox/logistics-api/types'

type LogisticsProviderLike = Pick<
  LogisticsProviderDraft,
  | 'code'
  | 'capabilities'
  | 'status'
  | 'appKey'
  | 'appSecret'
  | 'customerId'
  | 'checkWord'
>

type LogisticsProviderCredentialFieldKey = Extract<
  LogisticsProviderFieldKey,
  'appKey' | 'appSecret' | 'customerId' | 'checkWord'
>

type LogisticsProviderRule = {
  credentialFields: LogisticsProviderCredentialFieldKey[]
  requiredCredentialFields: LogisticsProviderCredentialFieldKey[]
  requiresEndpoint: boolean
}

const allCredentialFields: LogisticsProviderCredentialFieldKey[] = [
  ...LOGISTICS_PROVIDER_CREDENTIAL_FIELD_KEYS,
]
const automaticVerificationRule: LogisticsProviderRule = {
  credentialFields: allCredentialFields,
  requiredCredentialFields: ['appKey', 'appSecret'],
  requiresEndpoint: false,
}

const automaticVerificationCodes = new Set([
  'SF',
  'JD',
  'ZTO',
  'YTO',
  'YD',
  'JTSD',
])

const logisticsProviderRuleMap: Record<string, LogisticsProviderRule> = {
  SF: automaticVerificationRule,
  JD: automaticVerificationRule,
  ZTO: automaticVerificationRule,
  YTO: automaticVerificationRule,
  YD: automaticVerificationRule,
  JTSD: automaticVerificationRule,
  '17TRACK': {
    credentialFields: allCredentialFields,
    requiredCredentialFields: ['appKey', 'appSecret'],
    requiresEndpoint: false,
  },
}

export function supportsAutomaticLogisticsVerification(
  provider: Pick<LogisticsProviderLike, 'code'>
) {
  return automaticVerificationCodes.has(provider.code.trim().toUpperCase())
}

export function getLogisticsProviderRule(
  provider: LogisticsProviderLike
): LogisticsProviderRule {
  const normalizedCode = provider.code.trim().toUpperCase()
  if (normalizedCode && logisticsProviderRuleMap[normalizedCode]) {
    return logisticsProviderRuleMap[normalizedCode]
  }

  return {
    credentialFields: allCredentialFields,
    requiredCredentialFields:
      provider.capabilities.length > 0 ? ['appKey', 'appSecret'] : [],
    requiresEndpoint: false,
  }
}

export function getLogisticsProviderVisibleCredentialFields(
  provider: LogisticsProviderLike
) {
  return getLogisticsProviderRule(provider).credentialFields
}

export function getLogisticsProviderRequiredCredentialFields(
  provider: LogisticsProviderLike
) {
  return getLogisticsProviderRule(provider).requiredCredentialFields
}

export function getLogisticsProviderMissingCredentialFields(
  provider: LogisticsProviderLike
) {
  return getLogisticsProviderRequiredCredentialFields(provider).filter(
    (field) => provider[field].trim() === ''
  )
}

export function isLogisticsProviderCredentialsComplete(
  provider: LogisticsProviderLike
) {
  return getLogisticsProviderMissingCredentialFields(provider).length === 0
}

export function isLogisticsProviderDraftValid(
  provider: Pick<LogisticsProviderDraft, 'name' | 'code'>
) {
  return provider.name.trim() !== '' && provider.code.trim() !== ''
}

export function getLogisticsProviderCredentialSummary(
  provider: LogisticsProvider | LogisticsProviderDraft
) {
  return {
    visibleFields: getLogisticsProviderVisibleCredentialFields(provider),
    requiredFields: getLogisticsProviderRequiredCredentialFields(provider),
    missingFields: getLogisticsProviderMissingCredentialFields(provider),
    complete: isLogisticsProviderCredentialsComplete(provider),
  }
}
