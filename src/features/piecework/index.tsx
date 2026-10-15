import { Outlet } from '@tanstack/react-router'
import type { TranslationKey } from '@/locales'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { pieceworkFinancePageMainClassName } from './components/piecework-finance-page-controls-and-action-dialog.styles'
import { getPieceworkTabs } from './tab-config'

export function Piecework() {
  const { t } = useLanguage()
  const tabs = getPieceworkTabs(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      t(key, params)
  )

  return (
    <ModuleTabbedLayout
      tabs={tabs}
      mainClassName={pieceworkFinancePageMainClassName}
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}
