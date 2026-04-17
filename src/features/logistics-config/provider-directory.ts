import {
  LOGISTICS_TEMPLATES,
  type LogisticsCapability,
  type LogisticsDirectoryCategory,
  type LogisticsProvider,
  type LogisticsTemplate,
  type LogisticsVerificationStatus,
} from '@/features/sandbox/logistics-api/types'

export const logisticsProviderQueryKey = ['logistics-push-providers'] as const

export const LOGISTICS_CAPABILITY_OPTIONS: Array<{ value: LogisticsCapability; label: string }> = [
  { value: 'tracking', label: '轨迹查询' },
  { value: 'callback', label: '回调推送' },
  { value: 'label', label: '电子面单' },
  { value: 'order_create', label: '下单建单' },
]

export function getLogisticsCapabilityLabel(capability: LogisticsCapability) {
  return LOGISTICS_CAPABILITY_OPTIONS.find((item) => item.value === capability)?.label || capability
}

export function toggleProviderCapability(provider: LogisticsProvider, capability: LogisticsCapability) {
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

export function formatProviderVerifiedAt(value?: string) {
  if (!value) return '未验证'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

export const emptyLogisticsProvider: LogisticsProvider = {
  name: '',
  code: '',
  category: 'domestic',
  website: '',
  contact: '',
  phone: '',
  note: '',
  endpoint: '',
  status: 'Enabled',
  capabilities: [],
  verificationStatus: 'unverified',
  lastVerificationMessage: '',
  appKey: '',
  appSecret: '',
  customerId: '',
  checkWord: '',
  quotaTotal: 0,
  quotaUsed: 0,
  quotaAlertAt: 100,
}

function normalizeValue(value?: string) {
  return (value || '').trim().toLowerCase()
}

export function getProviderCategory(provider: LogisticsProvider): LogisticsDirectoryCategory {
  return provider.category === 'international' ? 'international' : 'domestic'
}

export function findLogisticsTemplateByCode(code?: string): LogisticsTemplate | undefined {
  const normalizedCode = (code || '').trim().toUpperCase()
  if (!normalizedCode) return undefined
  return LOGISTICS_TEMPLATES.find((template) => template.code === normalizedCode)
}

export function applyLogisticsTemplate(base: LogisticsProvider, code: string): LogisticsProvider {
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
  return Boolean(provider.appKey?.trim()) && Boolean(provider.appSecret?.trim())
}

export function getProviderCapabilities(provider: LogisticsProvider) {
  if (provider.capabilities?.length) {
    return provider.capabilities
  }

  return findLogisticsTemplateByCode(provider.code)?.capabilities || []
}

export function isProviderApiConnected(provider: LogisticsProvider) {
  return provider.status === 'Enabled' && Boolean(provider.endpoint?.trim()) && hasProviderCredentials(provider)
}

export function getProviderVerificationStatus(provider: LogisticsProvider): LogisticsVerificationStatus {
  if (provider.status === 'Disabled') {
    return 'disabled'
  }

  return provider.verificationStatus || 'unverified'
}

export function getProviderVerificationLabel(status: LogisticsVerificationStatus) {
  switch (status) {
    case 'healthy':
      return '已验证可用'
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

export function getProviderVerificationBadgeClass(status: LogisticsVerificationStatus) {
  switch (status) {
    case 'healthy':
      return 'border-none bg-emerald-100 text-emerald-700'
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

export function findDuplicateProvider(providers: LogisticsProvider[], candidate: LogisticsProvider) {
  const normalizedCode = (candidate.code || '').trim().toUpperCase()
  const normalizedName = normalizeValue(candidate.name)

  return providers.find((provider) => {
    if (provider.id && candidate.id && provider.id === candidate.id) {
      return false
    }

    const providerCode = (provider.code || '').trim().toUpperCase()
    const providerName = normalizeValue(provider.name)

    return (normalizedCode !== '' && providerCode === normalizedCode) ||
      (normalizedName !== '' && providerName === normalizedName)
  })
}
