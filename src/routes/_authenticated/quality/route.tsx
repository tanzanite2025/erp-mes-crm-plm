import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getQualityTabs } from '@/features/quality/tab-config'

export const Route = createFileRoute('/_authenticated/quality')({
  component: function QualityLayout() {
    const { t } = useLanguage()

    return (
      <ModuleTabbedLayout
        title={t('quality.layout.title')}
        tabs={getQualityTabs(t)}
      >
        <Outlet />
      </ModuleTabbedLayout>
    )
  },
})
