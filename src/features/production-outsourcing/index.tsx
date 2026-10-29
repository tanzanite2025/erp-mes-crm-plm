import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { productionOutsourcingOperationGuideDefinitions } from './data/production-outsourcing-operation-guide-chapter-definitions'
import { getProductionOutsourcingTabs } from './tabs'

export function ProductionOutsourcing() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const user = useAuthStore((state) => state.user)
  const selectedGuideKind =
    pathname ===
    productionOutsourcingOperationGuideDefinitions.tasksAndPartners.path
      ? 'tasksAndPartners'
      : pathname ===
          productionOutsourcingOperationGuideDefinitions.sendReturnInspection
            .path
        ? 'sendReturnInspection'
        : null
  const guideEntryKind =
    pathname === '/production-outsourcing/transfers'
      ? 'sendReturnInspection'
      : 'tasksAndPartners'
  const guideEntryPath =
    productionOutsourcingOperationGuideDefinitions[guideEntryKind].path
  const guideEntryLabel = t(
    guideEntryKind === 'tasksAndPartners'
      ? 'productionOutsourcing.operationGuides.openTaskGuide'
      : 'productionOutsourcing.operationGuides.openScanningGuide'
  )

  return (
    <ModuleTabbedLayout
      tabs={
        selectedGuideKind
          ? [
              {
                key: selectedGuideKind,
                label: t(
                  `productionOutsourcing.operationGuides.${selectedGuideKind}.title`
                ),
                href: productionOutsourcingOperationGuideDefinitions[
                  selectedGuideKind
                ].path,
              },
            ]
          : getProductionOutsourcingTabs(t)
      }
      mainClassName={selectedGuideKind ? 'overflow-hidden pb-0' : undefined}
      contentClassName={
        selectedGuideKind ? 'h-full flex-1 overflow-hidden' : undefined
      }
      actions={
        !selectedGuideKind &&
        matchesPathPermissionProjection(user, guideEntryPath) ? (
          <Button asChild variant='ghost' size='sm' className='shrink-0'>
            <Link
              to={guideEntryPath}
              aria-label={guideEntryLabel}
              title={guideEntryLabel}
            >
              <BookOpen aria-hidden='true' className='size-4' />
              <span className='sm:hidden'>
                {t('productionOutsourcing.operationGuides.mobileEntryLabel')}
              </span>
              <span className='hidden sm:inline'>{guideEntryLabel}</span>
            </Link>
          </Button>
        ) : undefined
      }
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}
