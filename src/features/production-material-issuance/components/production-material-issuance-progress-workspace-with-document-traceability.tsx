import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionMaterialIssuanceActiveProgressQuery } from '../contracts/production-material-issuance-active-order-scope-progress-api-dto'
import { useProductionMaterialIssuanceActiveOrderProgress } from '../hooks/use-production-material-issuance-active-order-scope-progress-query'
import { ProductionMaterialIssuanceActiveScopeMaterialSummary } from './production-material-issuance-active-scope-material-summary'
import { ProductionMaterialIssuanceActiveScopeOrderLineProgress } from './production-material-issuance-active-scope-order-line-progress'
import { ProductionMaterialIssuanceFrozenDocumentTraceability } from './production-material-issuance-frozen-document-traceability'
import { ProductionMaterialIssuanceQuantityMeaningHelpPopover } from './production-material-issuance-quantity-meaning-help-popover'

export function ProductionMaterialIssuanceProgressWorkspaceWithDocumentTraceability() {
  const { allowsAction } = usePermissionActions()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return (
    <div className='min-w-0 space-y-4'>
      {actorId && allowsAction('action_production_material_issuance_view') ? (
        <AuthorizedProductionMaterialIssuanceActiveScopeProgress
          key={actorId}
          actorId={actorId}
        />
      ) : (
        <ProductionMaterialIssuanceActiveScopeViews />
      )}
      <ProductionMaterialIssuanceFrozenDocumentTraceability />
    </div>
  )
}

function AuthorizedProductionMaterialIssuanceActiveScopeProgress({
  actorId,
}: {
  actorId: string
}) {
  const [query, setQuery] =
    useState<ProductionMaterialIssuanceActiveProgressQuery>({
      materialsPage: 1,
      ordersPage: 1,
      pageSize: 20,
    })
  const result = useProductionMaterialIssuanceActiveOrderProgress(
    actorId,
    query
  )
  return (
    <ProductionMaterialIssuanceActiveScopeViews
      result={result}
      query={query}
      changePage={(view, page) =>
        setQuery((current) => ({
          ...current,
          [view === 'materials' ? 'materialsPage' : 'ordersPage']: page,
        }))
      }
    />
  )
}

function ProductionMaterialIssuanceActiveScopeViews({
  result,
  query,
  changePage,
}: {
  result?: ReturnType<typeof useProductionMaterialIssuanceActiveOrderProgress>
  query?: ProductionMaterialIssuanceActiveProgressQuery
  changePage?: (view: 'materials' | 'orders', page: number) => void
}) {
  const { t, locale } = useLanguage()
  const [view, setView] = useState<'materials' | 'orders'>('orders')
  const data =
    result && !result.isError && !result.isFetching ? result.data : undefined
  const scope = data?.scope
  const page = query
    ? view === 'materials'
      ? query.materialsPage
      : query.ordersPage
    : 1
  const total = scope
    ? view === 'materials'
      ? scope.materialCount
      : scope.sourceLineCount
    : 0
  return (
    <section className='min-w-0 space-y-3 rounded-xl border bg-card p-3 sm:p-4'>
      <section
        aria-labelledby='production-issuance-scope-title'
        className='min-w-0 space-y-2'
      >
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 id='production-issuance-scope-title' className='sr-only'>
            {t('mrp.productionMaterialIssuance.orderScope.title')}
          </h2>
          <dl className='flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs'>
            {(['orders', 'dispatch'] as const).map((field) => (
              <div
                key={field}
                className={
                  field === 'dispatch' ? 'hidden min-w-0 @xl:block' : 'min-w-0'
                }
              >
                <dt className='sr-only'>
                  {t(
                    `mrp.productionMaterialIssuance.orderScope.fields.${field}`
                  )}
                </dt>
                <dd className='leading-6 break-words text-muted-foreground'>
                  {!scope
                    ? '—'
                    : field === 'orders'
                      ? t(
                          'mrp.productionMaterialIssuance.activeProgress.orderCount',
                          {
                            orders: scope.activeOrderCount,
                            lines: scope.sourceLineCount,
                          }
                        )
                      : t(
                          'mrp.productionMaterialIssuance.activeProgress.dispatchCount',
                          {
                            dispatched: scope.dispatchedLineCount,
                            undispatched: scope.undispatchedLineCount,
                          }
                        )}
                </dd>
              </div>
            ))}
          </dl>
          {result && (
            <div className='flex items-center gap-2'>
              {data && (
                <time
                  dateTime={data.asOf}
                  className='hidden text-xs text-muted-foreground @xl:inline'
                >
                  {new Date(data.asOf).toLocaleString(locale)}
                </time>
              )}
              <Button
                variant='ghost'
                size='sm'
                className='size-8 shrink-0 p-0 @xl:w-auto @xl:px-3'
                aria-label={t(
                  'mrp.productionMaterialIssuance.activeProgress.refresh'
                )}
                disabled={result.isFetching}
                onClick={() => void result.refetch()}
              >
                <RefreshCw
                  aria-hidden='true'
                  className={`size-3.5 ${result.isFetching ? 'animate-spin' : ''}`}
                />
                <span className='hidden @xl:inline'>
                  {t('mrp.productionMaterialIssuance.activeProgress.refresh')}
                </span>
              </Button>
            </div>
          )}
        </div>
        {!result && (
          <p className='rounded-xl bg-muted/30 p-3 text-sm'>
            {t(
              'mrp.productionMaterialIssuance.documentList.permissionRequired'
            )}
          </p>
        )}
        {result?.isFetching && (
          <p role='status' className='text-sm'>
            {t('mrp.productionMaterialIssuance.activeProgress.loading')}
          </p>
        )}
        {result?.isError && (
          <p
            role='alert'
            className='rounded-xl bg-destructive/10 p-3 text-sm text-destructive'
          >
            {t('mrp.productionMaterialIssuance.activeProgress.failed')}
          </p>
        )}
        {scope && !scope.isComplete && (
          <p
            role='alert'
            className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
          >
            {t('mrp.productionMaterialIssuance.activeProgress.incomplete', {
              count: scope.issueLineCount,
            })}
          </p>
        )}
        <details className='text-xs leading-5 text-muted-foreground'>
          <summary className='w-fit cursor-pointer'>
            {t(
              'mrp.productionMaterialIssuance.activeProgress.scopeExplanation'
            )}
          </summary>
          <p className='mt-2'>
            {t('mrp.productionMaterialIssuance.orderScope.description')}
          </p>
          <p>{t('mrp.productionMaterialIssuance.orderScope.hint')}</p>
          <p className='mt-2'>
            {t('mrp.productionMaterialIssuance.activeProgress.warehouse')}
            {scope && (
              <>
                {' '}
                ·{' '}
                {t('mrp.productionMaterialIssuance.activeProgress.basisCount', {
                  count: scope.issueLineCount,
                })}
              </>
            )}
          </p>
          {scope && (
            <p>
              {t(
                'mrp.productionMaterialIssuance.activeProgress.dispatchCount',
                {
                  dispatched: scope.dispatchedLineCount,
                  undispatched: scope.undispatchedLineCount,
                }
              )}
            </p>
          )}
          <div className='mt-2'>
            <p className='font-medium'>
              {t('mrp.productionMaterialIssuance.availabilityTitle')}
            </p>
            <p>{t('mrp.productionMaterialIssuance.availabilityDescription')}</p>
          </div>
        </details>
      </section>
      <Tabs
        value={view}
        onValueChange={(value) => {
          if (value === 'materials' || value === 'orders') setView(value)
        }}
        className='min-w-0 gap-3'
      >
        <div className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
          <TabsList
            aria-label={t('mrp.productionMaterialIssuance.views.label')}
            className='grid h-auto max-w-sm min-w-0 flex-1 grid-cols-2'
          >
            <TabsTrigger value='orders' className='min-h-9 min-w-0'>
              {t('mrp.productionMaterialIssuance.views.orders')}
            </TabsTrigger>
            <TabsTrigger value='materials' className='min-h-9 min-w-0'>
              {t('mrp.productionMaterialIssuance.views.materials')}
            </TabsTrigger>
          </TabsList>
          <ProductionMaterialIssuanceQuantityMeaningHelpPopover compact />
        </div>
        <TabsContent value='materials' className='min-w-0'>
          <ProductionMaterialIssuanceActiveScopeMaterialSummary
            materials={data?.materials}
          />
        </TabsContent>
        <TabsContent value='orders' className='min-w-0'>
          <ProductionMaterialIssuanceActiveScopeOrderLineProgress
            orderLines={data?.orderLines}
          />
        </TabsContent>
      </Tabs>
      {data && query && changePage && (
        <nav
          aria-label={t(
            'mrp.productionMaterialIssuance.activeProgress.paginationLabel'
          )}
          className='flex flex-wrap items-center gap-3 text-sm'
        >
          <span>
            {t('mrp.productionMaterialIssuance.activeProgress.pagination', {
              page,
              count: total,
            })}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={page <= 1}
            onClick={() => changePage(view, page - 1)}
          >
            {t('mrp.productionMaterialIssuance.documentList.previous')}
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={page * query.pageSize >= total}
            onClick={() => changePage(view, page + 1)}
          >
            {t('mrp.productionMaterialIssuance.documentList.next')}
          </Button>
        </nav>
      )}
    </section>
  )
}
