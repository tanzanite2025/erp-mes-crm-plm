import { BookOpen } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { getInstallGuides } from '../data'
import { TerminalGuideBoard } from '../components/terminal-config-board'

export function InstallGuidesTab() {
  const { t } = useLanguage()

  return (
    <TerminalGuideBoard
      title={t('terminalConfig.pages.guides.title')}
      description={t('terminalConfig.pages.guides.description')}
      icon={BookOpen}
      guides={getInstallGuides(t)}
    />
  )
}
