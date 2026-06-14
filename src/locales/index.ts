import { enUSMessages as baseEnUSMessages } from './en-US'
import { basicSettingsEnUSOverrides } from './overrides/basic-settings.en-US'
import { basicSettingsZhCNOverrides } from './overrides/basic-settings.zh-CN'
import { systemManagementEnUSOverrides } from './overrides/system-management.en-US'
import { systemManagementZhCNOverrides } from './overrides/system-management.zh-CN'
import { workflowCoreEnUSOverrides } from './overrides/workflow-core.en-US'
import { workflowCoreZhCNOverrides } from './overrides/workflow-core.zh-CN'
import { purchaseEnUSOverrides } from './purchase.en-US'
import { purchaseZhCNOverrides } from './purchase.zh-CN'
import { salesEnUSOverrides } from './sales.en-US'
import { salesZhCNOverrides } from './sales.zh-CN'
import { zhCNMessages as baseZhCNMessages } from './zh-CN'

export type AppLocale = 'zh-CN' | 'en-US'

export const DEFAULT_LOCALE: AppLocale = 'zh-CN'
export const SUPPORTED_LOCALES: AppLocale[] = ['zh-CN', 'en-US']

function isMergeableRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type DeepMerge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof U
    ? K extends keyof T
      ? T[K] extends Record<string, unknown>
        ? U[K] extends Record<string, unknown>
          ? DeepMerge<T[K], U[K]>
          : U[K]
        : U[K]
      : U[K]
    : K extends keyof T
      ? T[K]
      : never
}

function deepMerge<
  T extends Record<string, unknown>,
  U extends Record<string, unknown>,
>(base: T, override: U): DeepMerge<T, U> {
  const result: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(override)) {
    const existing = result[key]
    if (isMergeableRecord(existing) && isMergeableRecord(value)) {
      result[key] = deepMerge(existing, value)
      continue
    }
    result[key] = value
  }

  return result as DeepMerge<T, U>
}

const zhCNMessages = deepMerge(baseZhCNMessages, purchaseZhCNOverrides)
const zhCNMessagesWithSales = deepMerge(zhCNMessages, salesZhCNOverrides)
const zhCNMessagesWithBasicSettings = deepMerge(
  zhCNMessagesWithSales,
  basicSettingsZhCNOverrides
)
const zhCNMessagesWithSystemManagement = deepMerge(
  zhCNMessagesWithBasicSettings,
  systemManagementZhCNOverrides
)
const zhCNMessagesWithWorkflowCore = deepMerge(
  zhCNMessagesWithSystemManagement,
  workflowCoreZhCNOverrides
)
const enUSMessages = deepMerge(baseEnUSMessages, purchaseEnUSOverrides)
const enUSMessagesWithSales = deepMerge(enUSMessages, salesEnUSOverrides)
const enUSMessagesWithBasicSettings = deepMerge(
  enUSMessagesWithSales,
  basicSettingsEnUSOverrides
)
const enUSMessagesWithSystemManagement = deepMerge(
  enUSMessagesWithBasicSettings,
  systemManagementEnUSOverrides
)
const enUSMessagesWithWorkflowCore = deepMerge(
  enUSMessagesWithSystemManagement,
  workflowCoreEnUSOverrides
)

export const messages = {
  'zh-CN': zhCNMessagesWithWorkflowCore,
  'en-US': enUSMessagesWithWorkflowCore,
} as const

type Primitive = string | number | boolean | bigint | symbol | null | undefined
type DotNestedKeys<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends Primitive
        ? K
        : `${K}` | `${K}.${DotNestedKeys<T[K]>}`
    }[keyof T & string]

export type MessageDictionary = (typeof messages)['zh-CN']
export type TranslationKey = DotNestedKeys<MessageDictionary>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getValueByPath(
  source: Record<string, unknown>,
  key: string
): string | undefined {
  const segments = key.split('.')
  let current: unknown = source

  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined
    }
    current = current[segment]
  }

  return typeof current === 'string' ? current : undefined
}

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => {
    const value = params[name]
    return value === undefined ? '' : String(value)
  })
}

export function translate(
  locale: AppLocale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const localeMessages = messages[locale]
  const fallbackMessages = messages[DEFAULT_LOCALE]
  const template =
    getValueByPath(localeMessages, key) ??
    getValueByPath(fallbackMessages, key) ??
    key

  return interpolate(template, params)
}
