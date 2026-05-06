import { SmartphoneCharging } from 'lucide-react'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getPdaCategories(t: TranslateFn) {
  return [
    {
      title: t('terminalConfig.resources.pda.workTerminals.title'),
      description: t('terminalConfig.resources.pda.workTerminals.description'),
      icon: SmartphoneCharging,
      items: [
        {
          title: t('terminalConfig.resources.pda.workTerminals.items.browserShell.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.common.androidPda'),
          packageType: t('terminalConfig.resources.common.terminalPackage'),
          note: t('terminalConfig.resources.pda.workTerminals.items.browserShell.note'),
          status: 'pendingUpload',
        },
        {
          title: t('terminalConfig.resources.pda.workTerminals.items.offlineGuide.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.common.androidPda'),
          packageType: t('terminalConfig.resources.common.operationManual'),
          note: t('terminalConfig.resources.pda.workTerminals.items.offlineGuide.note'),
          status: 'planned',
        },
      ],
    },
  ]
}
