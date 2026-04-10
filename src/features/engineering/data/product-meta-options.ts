import { type AppLocale } from '@/locales'

type LocalizedText = Record<AppLocale, string>

type ProductMetaDef = {
  value: string
  label: LocalizedText
}

export type ProductMetaOption = {
  label: string
  value: string
}

const TIRE_TYPE_DEFS: ProductMetaDef[] = [
  { value: 'Hooked', label: { 'zh-CN': '有钩', 'en-US': 'Hooked' } },
  { value: 'Hookless', label: { 'zh-CN': '无钩', 'en-US': 'Hookless' } },
  { value: 'Tubular', label: { 'zh-CN': '管胎', 'en-US': 'Tubular' } },
]

const BRAKE_TYPE_DEFS: ProductMetaDef[] = [
  { value: 'Disc', label: { 'zh-CN': '碟刹', 'en-US': 'Disc' } },
]

const TECH_SERIES_DEFS: ProductMetaDef[] = [
  { value: 'NORMAL', label: { 'zh-CN': '常规系列', 'en-US': 'Standard Series' } },
  { value: 'HIGHTG', label: { 'zh-CN': '高温系列', 'en-US': 'High TG Series' } },
]

const VERSION_LEVEL_DEFS: ProductMetaDef[] = [
  { value: 'STD', label: { 'zh-CN': '标准版', 'en-US': 'Standard' } },
  { value: 'Lightweight', label: { 'zh-CN': '轻量版', 'en-US': 'Lightweight' } },
  { value: 'Ultralight', label: { 'zh-CN': '超轻版', 'en-US': 'Ultralight' } },
  { value: 'Reinforced', label: { 'zh-CN': '加强版', 'en-US': 'Reinforced' } },
]

function localize(locale: AppLocale, text: LocalizedText): string {
  return text[locale] || text['zh-CN']
}

function toOptions(locale: AppLocale, defs: ProductMetaDef[]): ProductMetaOption[] {
  return defs.map((item) => ({
    value: item.value,
    label: localize(locale, item.label),
  }))
}

export function getTireTypeOptions(locale: AppLocale): ProductMetaOption[] {
  return toOptions(locale, TIRE_TYPE_DEFS)
}

export function getBrakeTypeOptions(locale: AppLocale): ProductMetaOption[] {
  return toOptions(locale, BRAKE_TYPE_DEFS)
}

export function getTechSeriesOptions(locale: AppLocale): ProductMetaOption[] {
  return toOptions(locale, TECH_SERIES_DEFS)
}

export function getVersionLevelOptions(locale: AppLocale): ProductMetaOption[] {
  return toOptions(locale, VERSION_LEVEL_DEFS)
}
