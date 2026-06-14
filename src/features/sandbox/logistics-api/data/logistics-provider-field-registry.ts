import type {
  LogisticsCapability,
  LogisticsProviderDraft,
} from '@/features/sandbox/logistics-api/types'

export type LogisticsProviderFieldKey = keyof LogisticsProviderDraft
export type LogisticsProviderFieldGroup =
  | 'identity'
  | 'directory'
  | 'integration'
  | 'credentials'
  | 'quota'
  | 'verification'
  | 'system'
export type LogisticsProviderFieldScope = 'platform' | 'supplier'

type LogisticsProviderFieldDefaultValue =
  LogisticsProviderDraft[LogisticsProviderFieldKey]

export type LogisticsProviderFieldDefinition = {
  key: LogisticsProviderFieldKey
  group: LogisticsProviderFieldGroup
  defaultValue: LogisticsProviderFieldDefaultValue
  editableScopes: LogisticsProviderFieldScope[]
  templateManaged?: boolean
  credentialField?: boolean
  persisted?: boolean
  cardVisible?: boolean
  platformLabelKey?: string
}

const sharedEditableScopes: LogisticsProviderFieldScope[] = [
  'platform',
  'supplier',
]
const emptyCapabilities: LogisticsCapability[] = []

export const logisticsProviderFieldRegistry: Record<
  LogisticsProviderFieldKey,
  LogisticsProviderFieldDefinition
> = {
  id: {
    key: 'id',
    group: 'system',
    defaultValue: undefined,
    editableScopes: [],
    persisted: false,
  },
  createdAt: {
    key: 'createdAt',
    group: 'system',
    defaultValue: undefined,
    editableScopes: [],
    persisted: false,
  },
  updatedAt: {
    key: 'updatedAt',
    group: 'system',
    defaultValue: undefined,
    editableScopes: [],
    persisted: false,
  },
  name: {
    key: 'name',
    group: 'identity',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
  },
  code: {
    key: 'code',
    group: 'identity',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
  },
  category: {
    key: 'category',
    group: 'directory',
    defaultValue: 'domestic',
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
  },
  website: {
    key: 'website',
    group: 'directory',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
  },
  contact: {
    key: 'contact',
    group: 'directory',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
  },
  phone: {
    key: 'phone',
    group: 'directory',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
  },
  note: {
    key: 'note',
    group: 'directory',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
  },
  appKey: {
    key: 'appKey',
    group: 'credentials',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    credentialField: true,
    platformLabelKey: 'appKey',
  },
  appSecret: {
    key: 'appSecret',
    group: 'credentials',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    credentialField: true,
    platformLabelKey: 'appSecret',
  },
  customerId: {
    key: 'customerId',
    group: 'credentials',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    credentialField: true,
    platformLabelKey: 'customerId',
  },
  checkWord: {
    key: 'checkWord',
    group: 'credentials',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    credentialField: true,
    platformLabelKey: 'checkWord',
  },
  endpoint: {
    key: 'endpoint',
    group: 'integration',
    defaultValue: '',
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
    platformLabelKey: 'endpoint',
  },
  status: {
    key: 'status',
    group: 'integration',
    defaultValue: 'Enabled',
    editableScopes: ['platform'],
    persisted: true,
  },
  capabilities: {
    key: 'capabilities',
    group: 'integration',
    defaultValue: emptyCapabilities,
    editableScopes: sharedEditableScopes,
    persisted: true,
    templateManaged: true,
    cardVisible: true,
  },
  verificationStatus: {
    key: 'verificationStatus',
    group: 'verification',
    defaultValue: 'unverified',
    editableScopes: [],
    persisted: false,
  },
  lastVerifiedAt: {
    key: 'lastVerifiedAt',
    group: 'verification',
    defaultValue: undefined,
    editableScopes: [],
    persisted: false,
  },
  lastVerificationMessage: {
    key: 'lastVerificationMessage',
    group: 'verification',
    defaultValue: '',
    editableScopes: [],
    persisted: false,
  },
  lastVerificationAction: {
    key: 'lastVerificationAction',
    group: 'verification',
    defaultValue: '',
    editableScopes: [],
    persisted: false,
  },
  referenceCount: {
    key: 'referenceCount',
    group: 'system',
    defaultValue: 0,
    editableScopes: [],
    persisted: false,
  },
  quotaTotal: {
    key: 'quotaTotal',
    group: 'quota',
    defaultValue: 0,
    editableScopes: [],
    persisted: false,
  },
  quotaUsed: {
    key: 'quotaUsed',
    group: 'quota',
    defaultValue: 0,
    editableScopes: [],
    persisted: false,
  },
  quotaAlertAt: {
    key: 'quotaAlertAt',
    group: 'quota',
    defaultValue: 100,
    editableScopes: ['platform'],
    persisted: true,
    platformLabelKey: 'quotaAlertAt',
  },
}

export const LOGISTICS_PROVIDER_CREDENTIAL_FIELD_KEYS = Object.values(
  logisticsProviderFieldRegistry
)
  .filter((field) => field.credentialField)
  .map((field) => field.key) as Array<
  Extract<
    LogisticsProviderFieldKey,
    'appKey' | 'appSecret' | 'customerId' | 'checkWord'
  >
>

export const LOGISTICS_PROVIDER_TEMPLATE_MANAGED_FIELD_KEYS = Object.values(
  logisticsProviderFieldRegistry
)
  .filter((field) => field.templateManaged)
  .map((field) => field.key)

export const LOGISTICS_PROVIDER_PERSISTED_FIELD_KEYS = Object.values(
  logisticsProviderFieldRegistry
)
  .filter((field) => field.persisted)
  .map((field) => field.key) as Array<
  Extract<LogisticsProviderFieldKey, keyof LogisticsProviderDraft>
>

export function createEmptyLogisticsProviderDraft(): LogisticsProviderDraft {
  return Object.values(
    logisticsProviderFieldRegistry
  ).reduce<LogisticsProviderDraft>((draft, field) => {
    ;(draft as unknown as Record<string, unknown>)[field.key] =
      cloneLogisticsProviderFieldDefaultValue(field.defaultValue)
    return draft
  }, {} as LogisticsProviderDraft)
}

function cloneLogisticsProviderFieldDefaultValue(
  value: LogisticsProviderFieldDefaultValue
) {
  if (Array.isArray(value)) {
    return [...value]
  }

  return value
}
