import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getTerminalConfigTabs } from '@/features/terminal-config/tabs'

export const Route = createFileRoute('/_authenticated/terminal-config')({
  component: TerminalConfigLayout,
})

function TerminalConfigLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout
      title={t('terminalConfig.moduleTitle')}
      tabs={getTerminalConfigTabs(t)}
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}
