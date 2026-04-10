import { type AppLocale } from '@/locales'

type LocalizedText = Record<AppLocale, string>

type SalesOrderTypeDef = {
  value: string
  label: LocalizedText
}

type SalesOrderClassificationDef = {
  value: string
  label: LocalizedText
  ext: string
}

export type SalesOrderOption = {
  label: string
  value: string
}

export type SalesOrderClassificationOption = SalesOrderOption & {
  ext: string
}

const SALES_ORDER_TYPE_DEFS: SalesOrderTypeDef[] = [
  { value: 'CUSTOMER', label: { 'zh-CN': '客户订单', 'en-US': 'Customer Order' } },
  { value: 'ESTIMATE', label: { 'zh-CN': '预估订单', 'en-US': 'Estimate Order' } },
  { value: 'OUTSOURCE', label: { 'zh-CN': '委外订单', 'en-US': 'Outsource Order' } },
  { value: 'REPLENISH', label: { 'zh-CN': '补货订单', 'en-US': 'Replenish Order' } },
  { value: 'RETURN', label: { 'zh-CN': '退货订单', 'en-US': 'Return Order' } },
  { value: 'STOCK', label: { 'zh-CN': '备货订单', 'en-US': 'Stock Order' } },
]

const SALES_ORDER_CLASSIFICATION_DEFS: SalesOrderClassificationDef[] = [
  { value: 'GENERAL', label: { 'zh-CN': '一般贸易', 'en-US': 'General Trade' }, ext: 'GS' },
  { value: 'TOLL', label: { 'zh-CN': '受托加工', 'en-US': 'Toll Processing' }, ext: 'TL' },
  { value: 'RD', label: { 'zh-CN': '研发试制', 'en-US': 'R&D Trial' }, ext: 'RD' },
  { value: 'PROJECT', label: { 'zh-CN': '项目专项', 'en-US': 'Project Order' }, ext: 'PJ' },
  { value: 'SAMPLE', label: { 'zh-CN': '样品订单', 'en-US': 'Sample Order' }, ext: 'SP' },
]

export const DEFAULT_SALES_ORDER_TYPE = SALES_ORDER_TYPE_DEFS[0].value
export const DEFAULT_SALES_ORDER_CLASSIFICATION = 'GENERAL'

function localize(locale: AppLocale, text: LocalizedText): string {
  return text[locale] || text['zh-CN']
}

export function getSalesOrderTypeOptions(locale: AppLocale): SalesOrderOption[] {
  return SALES_ORDER_TYPE_DEFS.map((item) => ({
    value: item.value,
    label: localize(locale, item.label),
  }))
}

export function getSalesOrderClassificationOptions(
  locale: AppLocale
): SalesOrderClassificationOption[] {
  return SALES_ORDER_CLASSIFICATION_DEFS.map((item) => ({
    value: item.value,
    label: localize(locale, item.label),
    ext: item.ext,
  }))
}

export function getSalesOrderTypeLabel(value: string | undefined, locale: AppLocale): string | undefined {
  if (!value) return undefined
  const target = SALES_ORDER_TYPE_DEFS.find((item) => item.value === value)
  return target ? localize(locale, target.label) : undefined
}

export function getSalesOrderClassificationLabel(
  value: string | undefined,
  locale: AppLocale
): string | undefined {
  if (!value) return undefined
  const target = SALES_ORDER_CLASSIFICATION_DEFS.find((item) => item.value === value)
  return target ? localize(locale, target.label) : undefined
}

export function getSalesOrderClassificationExt(value: string | undefined): string {
  if (!value) return 'GS'
  const target = SALES_ORDER_CLASSIFICATION_DEFS.find((item) => item.value === value)
  if (target) return target.ext
  return value.slice(0, 2).toUpperCase() || 'GS'
}
