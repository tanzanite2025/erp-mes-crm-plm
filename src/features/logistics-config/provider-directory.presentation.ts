import type { TranslationKey } from '@/locales'
import {
  getProviderVerificationStatus,
  hasProviderCredentials,
  supportsProviderAutomaticVerification,
} from '@/features/logistics-config/provider-directory.domain'
import {
  type LogisticsCapability,
  type LogisticsProvider,
  type LogisticsVerificationStatus,
} from '@/features/sandbox/logistics-api/types'

export const LOGISTICS_CAPABILITY_OPTIONS: Array<{
  value: LogisticsCapability
  label: string
}> = [
  { value: 'tracking', label: '轨迹查询' },
  { value: 'callback', label: '回调推送' },
  { value: 'label', label: '电子面单' },
  { value: 'order_create', label: '下单建单' },
]

type ProviderCalloutTone = 'info' | 'warning' | 'neutral'

export function getLogisticsCapabilityLabel(capability: LogisticsCapability) {
  return (
    LOGISTICS_CAPABILITY_OPTIONS.find((item) => item.value === capability)
      ?.label || capability
  )
}

export function getLogisticsCapabilityLabelKey(
  capability: LogisticsCapability
): TranslationKey {
  switch (capability) {
    case 'tracking':
      return 'logisticsConfig.providerShared.capabilityLabels.tracking'
    case 'callback':
      return 'logisticsConfig.providerShared.capabilityLabels.callback'
    case 'label':
      return 'logisticsConfig.providerShared.capabilityLabels.label'
    default:
      return 'logisticsConfig.providerShared.capabilityLabels.order_create'
  }
}

export function formatProviderVerifiedAt(
  value?: string,
  locale: string = 'zh-CN'
) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale, { hour12: false })
}

export function getProviderVerificationLabel(
  status: LogisticsVerificationStatus
) {
  switch (status) {
    case 'reachable':
      return '已探测可达'
    case 'healthy':
      return '已验证可用'
    case 'manual_review':
      return '需人工联调'
    case 'error':
      return '最近异常'
    case 'invalid_config':
      return '配置不完整'
    case 'disabled':
      return '已停用'
    default:
      return '已建档未验证'
  }
}

export function getProviderVerificationLabelKey(
  status: LogisticsVerificationStatus
): TranslationKey {
  switch (status) {
    case 'reachable':
      return 'logisticsConfig.providerShared.verificationStatus.reachable'
    case 'healthy':
      return 'logisticsConfig.providerShared.verificationStatus.healthy'
    case 'manual_review':
      return 'logisticsConfig.providerShared.verificationStatus.manual_review'
    case 'error':
      return 'logisticsConfig.providerShared.verificationStatus.error'
    case 'invalid_config':
      return 'logisticsConfig.providerShared.verificationStatus.invalid_config'
    case 'disabled':
      return 'logisticsConfig.providerShared.verificationStatus.disabled'
    default:
      return 'logisticsConfig.providerShared.verificationStatus.unverified'
  }
}

export function getProviderVerificationBadgeClass(
  status: LogisticsVerificationStatus
) {
  switch (status) {
    case 'reachable':
      return 'border-none bg-cyan-100 text-cyan-700'
    case 'healthy':
      return 'border-none bg-emerald-100 text-emerald-700'
    case 'manual_review':
      return 'border-none bg-violet-100 text-violet-700'
    case 'error':
      return 'border-none bg-rose-100 text-rose-700'
    case 'invalid_config':
      return 'border-none bg-amber-100 text-amber-700'
    case 'disabled':
      return 'border-none bg-slate-200 text-slate-700'
    default:
      return 'border-none bg-blue-100 text-blue-700'
  }
}

export function getProviderApiConnectionBadgeClass(isConnected: boolean) {
  return isConnected
    ? 'border-none bg-emerald-100 text-emerald-700'
    : 'border-none bg-slate-200 text-slate-700'
}

export function getProviderApiConnectionLabelKey(
  isConnected: boolean
): TranslationKey {
  return isConnected
    ? 'logisticsConfig.providerShared.apiConnection.connected'
    : 'logisticsConfig.providerShared.apiConnection.notConnected'
}

export function getProviderCredentialsBadgeClass(hasCredentials: boolean) {
  return hasCredentials
    ? 'border-none bg-emerald-100 text-emerald-700'
    : 'border-none bg-amber-100 text-amber-700'
}

export function getProviderCredentialsLabelKey(
  hasCredentials: boolean
): TranslationKey {
  return hasCredentials
    ? 'logisticsConfig.providerShared.credentials.configured'
    : 'logisticsConfig.providerShared.credentials.missing'
}

export function getProviderReferenceBadgeClass(hasReferences: boolean) {
  return hasReferences
    ? 'border-none bg-amber-100 text-amber-700'
    : 'border-none bg-slate-100 text-slate-600'
}

export function getProviderReferenceBadgeLabelKey(): TranslationKey {
  return 'logisticsConfig.providerShared.reference.badge'
}

export function getProviderLifecycleBadgeClass(
  status: LogisticsProvider['status']
) {
  return status === 'Enabled'
    ? 'rounded-full bg-emerald-100/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-600'
    : 'rounded-full bg-slate-200/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-slate-500'
}

export function getProviderLifecycleLabelKey(
  status: LogisticsProvider['status']
): TranslationKey {
  return status === 'Enabled'
    ? 'logisticsConfig.providerShared.lifecycle.enabled'
    : 'logisticsConfig.providerShared.lifecycle.disabled'
}

export function getProviderCalloutClass(tone: ProviderCalloutTone) {
  switch (tone) {
    case 'info':
      return 'rounded-2xl border border-dashed border-primary/30 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-primary/80'
    case 'warning':
      return 'rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-700'
    default:
      return 'rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-slate-600'
  }
}

export function getProviderVerificationActionTone(
  provider: LogisticsProvider
): ProviderCalloutTone {
  const status = getProviderVerificationStatus(provider)

  if (
    status === 'healthy' ||
    status === 'reachable' ||
    status === 'unverified' ||
    status === 'manual_review'
  ) {
    return 'info'
  }

  return 'warning'
}

export function getProviderReferenceTone(
  provider: LogisticsProvider
): ProviderCalloutTone {
  return (provider.referenceCount || 0) > 0 ? 'warning' : 'neutral'
}

export function getProviderVerificationAction(provider: LogisticsProvider) {
  return (
    (provider.lastVerificationAction || '').trim() ||
    '请根据当前状态补齐配置后重新测试连接。'
  )
}

export function getProviderVerificationActionKey(
  provider: LogisticsProvider
): TranslationKey {
  const status = getProviderVerificationStatus(provider)
  const normalizedCode = (provider.code || '').trim().toUpperCase()

  if (status === 'disabled') {
    return 'logisticsConfig.providerShared.nextActions.disabled'
  }

  if (status === 'healthy') {
    return 'logisticsConfig.providerShared.nextActions.healthy'
  }

  if (status === 'manual_review') {
    return 'logisticsConfig.providerShared.nextActions.manualReview'
  }

  if (status === 'error') {
    return 'logisticsConfig.providerShared.nextActions.error'
  }

  if (status === 'reachable') {
    switch (normalizedCode) {
      case 'SF':
        return 'logisticsConfig.providerShared.nextActions.reachableSF'
      case 'JD':
        return 'logisticsConfig.providerShared.nextActions.reachableJD'
      case '17TRACK':
        return 'logisticsConfig.providerShared.nextActions.reachable17Track'
      default:
        return 'logisticsConfig.providerShared.nextActions.reachableGeneric'
    }
  }

  if (status === 'invalid_config') {
    if (!hasProviderCredentials(provider)) {
      return 'logisticsConfig.providerShared.nextActions.invalidConfigCredentials'
    }
    return 'logisticsConfig.providerShared.nextActions.invalidConfigGeneral'
  }

  if (
    !supportsProviderAutomaticVerification(provider) &&
    hasProviderCredentials(provider)
  ) {
    return 'logisticsConfig.providerShared.nextActions.manualReview'
  }

  return 'logisticsConfig.providerShared.nextActions.unverified'
}

export function getProviderVerificationSummaryKey(
  provider: LogisticsProvider
): TranslationKey {
  const status = getProviderVerificationStatus(provider)

  switch (status) {
    case 'reachable':
      return 'logisticsConfig.providerShared.summaries.reachable'
    case 'healthy':
      return 'logisticsConfig.providerShared.summaries.healthy'
    case 'manual_review':
      return 'logisticsConfig.providerShared.summaries.manual_review'
    case 'error':
      return 'logisticsConfig.providerShared.summaries.error'
    case 'invalid_config':
      return 'logisticsConfig.providerShared.summaries.invalid_config'
    case 'disabled':
      return 'logisticsConfig.providerShared.summaries.disabled'
    default:
      return 'logisticsConfig.providerShared.summaries.unverified'
  }
}

export function getProviderReferenceRiskLabel(provider: LogisticsProvider) {
  if ((provider.referenceCount || 0) > 0) {
    return `已被 ${provider.referenceCount} 条业务记录引用，禁止直接删除或改码`
  }

  return '当前未发现业务引用，可继续维护或删除'
}

export function getProviderReferenceRiskLabelKey(
  provider: LogisticsProvider
): TranslationKey {
  return (provider.referenceCount || 0) > 0
    ? 'logisticsConfig.providerShared.reference.risk'
    : 'logisticsConfig.providerShared.reference.safe'
}
