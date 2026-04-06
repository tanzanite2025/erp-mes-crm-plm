import { Download } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import {
  getPdaCategories,
  getPrinterCategories,
  getScannerCategories,
} from '../data'
import { TerminalConfigBoard } from '../components/terminal-config-board'

export function DriverDownloadsTab() {
  const { t } = useLanguage()

  return (
    <TerminalConfigBoard
      title={t('terminalConfig.pages.downloads.title')}
      description={t('terminalConfig.pages.downloads.description')}
      icon={Download}
      sections={[...getPrinterCategories(t), ...getPdaCategories(t), ...getScannerCategories(t)]}
      summary={t('terminalConfig.pages.downloads.summary')}
    />
  )
}
