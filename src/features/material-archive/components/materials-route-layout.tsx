import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { BookOpen, Package2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  getProductionMaterialCreationOperationGuideTabs,
  PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH,
} from '../production-material-creation-operation-guide-tab-config'
import { getMaterialRouteTabs } from '../tab-config'

export function MaterialsRouteLayout() {
  const { t, locale } = useLanguage()
  const { pathname } = useLocation()
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  const isOperationGuide =
    pathname.replace(/\/$/, '') ===
    PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH
  const tabs = getMaterialRouteTabs(locale, t)
  const canReadOperationGuide =
    isIdentitySynced &&
    matchesPathPermissionProjection(
      user,
      PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH
    )

  if (isOperationGuide) {
    return (
      <ModuleTabbedLayout
        tabs={getProductionMaterialCreationOperationGuideTabs(t)}
        mainClassName='overflow-hidden pb-0'
        contentClassName='h-full flex-1 overflow-hidden'
      >
        <Outlet />
      </ModuleTabbedLayout>
    )
  }

  return (
    <ModuleTabbedLayout tabs={tabs}>
      <div className='flex flex-col gap-8'>
        <IndustrialHeader
          icon={Package2}
          title={t('materialArchive.layout.title')}
          description={t('materialArchive.layout.description')}
          statusBadge={
            canReadOperationGuide ? (
              <Link
                to='/materials/production-material-creation-guide'
                className='inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40'
              >
                <BookOpen aria-hidden='true' className='size-4 shrink-0' />
                {t('materialArchive.operationGuide.entryLabel')}
              </Link>
            ) : undefined
          }
        />
        <Outlet />
      </div>
    </ModuleTabbedLayout>
  )
}
