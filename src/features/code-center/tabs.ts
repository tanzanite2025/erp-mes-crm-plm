import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getLinearBarcodeTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'protocol',
      label: t('codeCenter.linearBarcode.tabs.protocol'),
      href: '/code-center/linear-barcode/protocol',
    },
    {
      key: 'print',
      label: t('codeCenter.linearBarcode.tabs.print'),
      href: '/code-center/linear-barcode/print',
    },
    {
      key: 'status',
      label: t('codeCenter.linearBarcode.tabs.status'),
      href: '/code-center/linear-barcode/status',
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
    {
      key: 'numberingEngine',
      label: t('codeCenter.sharedCodeSource.tabs.numberingEngine'),
      href: '/code-center/shared-code-source/numbering-engine',
    },
  ]
}
