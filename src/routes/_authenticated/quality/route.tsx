import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import {
  getQualityTabs,
  getQualityStandardCreationGuideTabs,
} from '@/features/quality/tab-config'

export const Route = createFileRoute('/_authenticated/quality')({
  component: function QualityRouteLayout() {
    const { t } = useLanguage()
    const { pathname } = useLocation()
    const isStandardCreationGuide =
      pathname === '/quality/standard-creation-guide'

    return (
      <ModuleTabbedLayout
        tabs={
          isStandardCreationGuide
            ? getQualityStandardCreationGuideTabs(t)
            : getQualityTabs(t)
        }
        mainClassName={
          isStandardCreationGuide ? 'overflow-hidden pb-0' : undefined
        }
        contentClassName={
          isStandardCreationGuide ? 'h-full flex-1 overflow-hidden' : undefined
        }
      >
        <Outlet />
      </ModuleTabbedLayout>
    )
  },
})
