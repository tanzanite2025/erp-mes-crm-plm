import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getTerminalConfigTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'printers', label: t('terminalConfig.tabs.printers'), href: '/terminal-config/printers' },
    { key: 'pda', label: t('terminalConfig.tabs.pda'), href: '/terminal-config/pda' },
    { key: 'scanners', label: t('terminalConfig.tabs.scanners'), href: '/terminal-config/scanners' },
    { key: 'downloads', label: t('terminalConfig.tabs.downloads'), href: '/terminal-config/downloads' },
    { key: 'guides', label: t('terminalConfig.tabs.guides'), href: '/terminal-config/guides' },
  ]
}
