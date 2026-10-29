import { Link } from '@tanstack/react-router'
import { BookOpen, PackageOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { buttonVariants } from '@/components/ui/button'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { ProductionMaterialIssuanceFrozenDocumentTraceability } from '../components/production-material-issuance-frozen-document-traceability'
import { ProductionMaterialIssuanceStartWorkflowNavigationLink } from '../components/production-material-issuance-start-workflow-navigation-link'

/** Warehouse composition of the original documents; no separate issuance ledger. */
export function ProductionMaterialIssuanceWarehouseHandoverHandlingPage({
  initialDocumentId,
}: { initialDocumentId?: string } = {}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  return (
    <div className='@container flex min-w-0 animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={PackageOpen}
        title={t('mrp.productionMaterialIssuance.warehouseHandling.pageTitle')}
        description={t(
          'mrp.productionMaterialIssuance.warehouseHandling.pageDescription'
        )}
        statusBadge={
          matchesPathPermissionProjection(
            user,
            '/warehouse/production-material-handovers-guide'
          ) ? (
            <Link
              to='/warehouse/production-material-handovers-guide'
              className={buttonVariants({
                variant: 'outline',
                className: 'h-auto min-h-10 max-w-full whitespace-normal',
              })}
            >
              <BookOpen aria-hidden='true' className='size-4 shrink-0' />
              {t('warehouse.productionMaterialHandoversGuide.openGuide')}
            </Link>
          ) : null
        }
      />
      <section className='space-y-3 rounded-2xl border border-dashed bg-muted/5 p-4'>
        <p className='text-sm leading-7 text-muted-foreground'>
          {t('mrp.productionMaterialIssuance.start.warehouseStartHint')}
        </p>
        <ProductionMaterialIssuanceStartWorkflowNavigationLink />
      </section>
      <ProductionMaterialIssuanceFrozenDocumentTraceability
        key={initialDocumentId ?? 'list'}
        initialDocumentId={initialDocumentId}
        allowWithdrawalCommands={false}
      />
    </div>
  )
}
