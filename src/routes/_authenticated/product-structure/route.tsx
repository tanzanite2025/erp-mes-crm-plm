import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getProductStructureTabs } from '@/features/product-structure/tab-config'

export const Route = createFileRoute('/_authenticated/product-structure')({
  component: ProductStructureLayout,
})

function ProductStructureLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getProductStructureTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
