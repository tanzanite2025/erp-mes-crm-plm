import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getLinearBarcodeTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'protocol',
      label: t('codeCenter.linearBarcode.tabs.protocol'),
      href: '/code-center/linear-barcode/protocol',
    },
    {
      key: 'numbering',
      label: t('codeCenter.linearBarcode.tabs.numbering'),
      href: '/code-center/linear-barcode/numbering',
    },
  ]
}

export function getDmCodeTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'rules',
      label: t('codeCenter.dmCode.tabs.rules'),
      href: '/code-center/dm-code',
    },
  ]
}

export function getSharedCodeSourceTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'holeCodes',
      label: t('codeCenter.sharedCodeSource.tabs.holeCodes'),
      href: '/code-center/shared-code-source/hole-codes',
    },
  ]
}
