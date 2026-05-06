import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getTerminalConfigTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'pda',
      label: t('terminalConfig.tabs.pda'),
      href: '/terminal-config/pda',
    },
    {
      key: 'scanners',
      label: t('terminalConfig.tabs.scanners'),
      href: '/terminal-config/scanners',
    },
    {
      key: 'mobile-capture',
      label: t('terminalConfig.tabs.mobileCapture'),
      href: '/terminal-config/mobile-capture',
    },
  ]
}
