import { Printer } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { getPrinterCategories } from '../data'
import { TerminalConfigBoard } from '../components/terminal-config-board'

export function PrinterDriversTab() {
  const { t } = useLanguage()

  return (
    <TerminalConfigBoard
      title={t('terminalConfig.pages.printers.title')}
      description={t('terminalConfig.pages.printers.description')}
      icon={Printer}
      sections={getPrinterCategories(t)}
      summary={t('terminalConfig.pages.printers.summary')}
    />
  )
}
