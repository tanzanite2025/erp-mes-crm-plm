import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { Package2 } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { getMaterialRouteTabs } from '@/features/material-archive/tab-config'
import { getMaterialListQueryKey, MATERIAL_OPTIONS_QUERY_KEY } from '@/features/material-archive/query-keys'
import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'
import { useLanguage } from '@/context/language-provider'

export const Route = createFileRoute('/_authenticated/materials')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: MATERIAL_OPTIONS_QUERY_KEY,
        queryFn: () => MaterialCoreService.getMaterialOptions(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: getMaterialListQueryKey('all', 0, 20, ''),
        queryFn: () => MaterialCoreService.getMaterials('all', 1, 20, ''),
      }),
    ])

    return null
  },
  component: MaterialsLayout,
})

function MaterialsLayout() {
  const { t, locale } = useLanguage()
  const tabs = getMaterialRouteTabs(locale, t)

  return (
    <ModuleTabbedLayout tabs={tabs}>
        <div className='flex flex-col gap-8'>
          <IndustrialHeader
            icon={Package2}
            title={t('materialArchive.layout.title')}
            description={t('materialArchive.layout.description')}
          />
          <Outlet />
        </div>
      </ModuleTabbedLayout>
  )
}
