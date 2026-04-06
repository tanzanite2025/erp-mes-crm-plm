import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { engineeringDbTabs } from '@/features/engineering-db/tab-config'

export const Route = createFileRoute('/_authenticated/engineering-db')({
  component: EngineeringDBLayout,
})

function EngineeringDBLayout() {
  return (
    <ModuleTabbedLayout title='工程建模数据库' tabs={engineeringDbTabs}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
