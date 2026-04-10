import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useMemo } from 'react'
import { Package2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { getMaterialCategoryOptions } from '@/features/material-archive/data/material-category-options'
import { getMaterialStaticTabs } from '@/features/material-archive/tab-config'
import { useLanguage } from '@/context/language-provider'

export const Route = createFileRoute('/_authenticated/materials')({
  component: MaterialsLayout,
})

function MaterialsLayout() {
  const { t, locale } = useLanguage()
  const tabs = useMemo(() => {
    const dynamicTabs = getMaterialCategoryOptions(locale).map((opt) => ({
      key: opt.value.toLowerCase(),
      label: opt.label,
      href: `/materials/${opt.value}`,
    }))

    return [...getMaterialStaticTabs(t), ...dynamicTabs]
  }, [locale, t])

  return (
    <ModuleTabbedLayout tabs={tabs}>
        <div className='flex flex-col gap-8'>
          <PageHeader
            icon={Package2}
            title={t('materialArchive.layout.title')}
            description={t('materialArchive.layout.description')}
          />
          <Outlet />
        </div>
      </ModuleTabbedLayout>
  )
}
