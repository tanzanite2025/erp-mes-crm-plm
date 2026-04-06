import { ScanLine } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { ScanPlatformModulePanel } from '@/features/scan-platform'
import { TerminalConfigBoard } from '../components/terminal-config-board'
import { getScannerCategories } from '../data'

export function ScannerDevicesTab() {
  const { t } = useLanguage()

  return (
    <>
      <TerminalConfigBoard
        title={t('terminalConfig.pages.scanners.title')}
        description={t('terminalConfig.pages.scanners.description')}
        icon={ScanLine}
        sections={getScannerCategories(t)}
        summary={t('terminalConfig.pages.scanners.summary')}
      />
      <ScanPlatformModulePanel />
    </>
  )
}
