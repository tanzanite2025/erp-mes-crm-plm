import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getQualityTabs } from '@/features/quality/tab-config'

export const Route = createFileRoute('/_authenticated/quality')({
  component: function QualityRouteLayout() {
    const { t } = useLanguage()

    return (
      <ModuleTabbedLayout
        tabs={getQualityTabs(t)}
      >
        <Outlet />
      </ModuleTabbedLayout>
    )
  },
})
