import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getEngineeringReferenceTabs } from '@/features/engineering-reference/tab-config'

export const Route = createFileRoute('/_authenticated/engineering-reference')({
  component: function EngineeringReferenceRoute() {
    const { t } = useLanguage()

    return (
      <ModuleTabbedLayout
        tabs={getEngineeringReferenceTabs(t)}
      >
        <Outlet />
      </ModuleTabbedLayout>
    )
  },
})
