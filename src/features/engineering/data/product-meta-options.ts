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
  { value: 'hooked', label: { 'zh-CN': '有钩', 'en-US': 'Hooked' } },
  { value: 'hookless', label: { 'zh-CN': '无钩', 'en-US': 'Hookless' } },
  { value: 'tubular', label: { 'zh-CN': '管胎', 'en-US': 'Tubular' } },
]

const BRAKE_TYPE_DEFS: ProductMetaDef[] = [
  { value: 'disc', label: { 'zh-CN': '碟刹', 'en-US': 'Disc' } },
]

const TECH_SERIES_DEFS: ProductMetaDef[] = [
  { value: 'normal', label: { 'zh-CN': '常规系列', 'en-US': 'Standard Series' } },
  { value: 'high-tg', label: { 'zh-CN': '高温系列', 'en-US': 'High TG Series' } },
]

const VERSION_LEVEL_DEFS: ProductMetaDef[] = [
  { value: 'std', label: { 'zh-CN': '标准版', 'en-US': 'Standard' } },
  { value: 'lightweight', label: { 'zh-CN': '轻量版', 'en-US': 'Lightweight' } },
  { value: 'ultralight', label: { 'zh-CN': '超轻版', 'en-US': 'Ultralight' } },
  { value: 'reinforced', label: { 'zh-CN': '加强版', 'en-US': 'Reinforced' } },
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
