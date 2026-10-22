import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { bomQueryKeys } from '@/features/product-structure/query-keys'
import { bomService } from '@/features/product-structure/services/bom-service'

export function ProductLinkedBomRecordsReadOnlySection({
  productId,
  onNavigateToBomManagement,
}: {
  productId: string | undefined
  onNavigateToBomManagement: () => void
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const canViewBom = matchesPathPermissionProjection(
    user,
    '/product-structure/bom'
  )
  const linkedBomsQuery = useQuery({
    queryKey: bomQueryKeys.associationOptions(productId),
    queryFn: () =>
      bomService.getBOMAssociationOptions({ productId: productId! }),
    enabled: Boolean(productId) && canViewBom,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: false,
  })
  const linkedBoms = (linkedBomsQuery.data ?? []).filter(
    (bom) => bom.productId === productId
  )

  return (
    <section
      aria-label={t('engineering.productMgmt.linkedBoms.title')}
      className='space-y-2 rounded-2xl border border-dashed bg-muted/5 p-3'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-xs font-semibold'>
          {t('engineering.productMgmt.linkedBoms.title')}
        </h3>
        {productId && canViewBom && (
          <Button asChild size='sm' variant='outline'>
            <Link
              to='/product-structure/bom'
              onClick={onNavigateToBomManagement}
            >
              {t('engineering.productMgmt.linkedBoms.openManagement')}
            </Link>
          </Button>
        )}
      </div>
      <p className='text-xs text-muted-foreground'>
        {t(
          productId
            ? 'engineering.productMgmt.linkedBoms.description'
            : 'engineering.productMgmt.linkedBoms.saveProductFirst'
        )}
      </p>
      {productId &&
        (!canViewBom ? (
          <p role='status' className='text-xs text-muted-foreground'>
            {t('engineering.productMgmt.linkedBoms.accessRequired')}
          </p>
        ) : linkedBomsQuery.isPending ||
          !linkedBomsQuery.isFetchedAfterMount ? (
          <p role='status' className='text-xs text-muted-foreground'>
            {t('engineering.productMgmt.linkedBoms.loading')}
          </p>
        ) : linkedBomsQuery.isError ? (
          <div role='status' className='flex flex-wrap items-center gap-2'>
            <p className='text-xs text-muted-foreground'>
              {t('engineering.productMgmt.linkedBoms.loadFailed')}
            </p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void linkedBomsQuery.refetch()}
            >
              {t('engineering.productMgmt.linkedBoms.retry')}
            </Button>
          </div>
        ) : linkedBoms.length ? (
          <ul className='grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2'>
            {linkedBoms.map((bom) => (
              <li key={bom.id} className='min-w-0 rounded-lg border p-2'>
                <p className='text-xs font-medium break-all'>
                  {[bom.bomNo || bom.id, bom.bomVersion, bom.bomType]
                    .filter(Boolean)
                    .join(' / ')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p role='status' className='text-xs text-muted-foreground'>
            {t('engineering.productMgmt.linkedBoms.empty')}
          </p>
        ))}
    </section>
  )
}
