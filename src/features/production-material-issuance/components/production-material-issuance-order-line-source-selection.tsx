import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import type { useProductionMaterialIssuanceSourceSelectionAndPreparation } from '../hooks/use-production-material-issuance-source-selection-and-preparation'

export function ProductionMaterialIssuanceOrderLineSourceSelection({
  workflow,
}: {
  workflow: ReturnType<
    typeof useProductionMaterialIssuanceSourceSelectionAndPreparation
  >
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const [search, setSearch] = useState('')
  const { selected, options, query, setQuery } = workflow
  return (
    <section
      className='min-w-0 space-y-4'
      aria-label={t('mrp.productionMaterialIssuance.start.selectSources')}
    >
      <h3 className='text-sm font-semibold'>
        {t('mrp.productionMaterialIssuance.start.selectSources')}
      </h3>
      <form
        className='flex gap-2'
        onSubmit={(event) => {
          event.preventDefault()
          setQuery({ ...query, search: search.trim(), page: 1 })
        }}
      >
        <Input
          aria-label={t('mrp.productionMaterialIssuance.start.search')}
          placeholder={t('mrp.productionMaterialIssuance.start.search')}
          value={search}
          maxLength={200}
          onChange={(event) => setSearch(event.target.value)}
          className='min-w-0'
        />
        <Button type='submit' variant='outline'>
          {t('mrp.productionMaterialIssuance.start.searchAction')}
        </Button>
      </form>
      {options.isFetching && (
        <p role='status' className='text-sm'>
          {t('mrp.productionMaterialIssuance.start.loading')}
        </p>
      )}
      {options.isError ? (
        <div role='alert' className='space-y-2 text-sm text-destructive'>
          <p>
            {t('mrp.productionMaterialIssuance.start.loadFailed')}{' '}
            {options.error.message}
          </p>
          <Button variant='outline' onClick={() => void options.refetch()}>
            {t('mrp.productionMaterialIssuance.documentList.refresh')}
          </Button>
        </div>
      ) : (
        options.data && (
          <>
            {options.data.items.length === 0 && (
              <p className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
                {t('mrp.productionMaterialIssuance.start.noSources')}
              </p>
            )}
            <ul className='grid min-w-0 gap-3 sm:grid-cols-2'>
              {options.data.items.map((source) => {
                const checked = selected.some(
                  (item) => item.salesOrderLineId === source.salesOrderLineId
                )
                const label = `${source.orderNo} / ${source.lineNo} · ${source.productName}`
                return (
                  <li
                    key={source.salesOrderLineId}
                    className='min-w-0 space-y-2 rounded-xl border border-dashed p-3'
                  >
                    <label className='flex items-start gap-2 text-sm font-medium wrap-anywhere'>
                      <input
                        type='checkbox'
                        className='mt-1 size-4 shrink-0 accent-primary'
                        checked={checked}
                        disabled={
                          Boolean(source.documentId) ||
                          options.isFetching ||
                          (!checked && selected.length >= 500)
                        }
                        onChange={() =>
                          workflow.toggleProductionMaterialIssuanceSource(
                            source
                          )
                        }
                      />
                      <span>{label}</span>
                    </label>
                    <p className='text-xs leading-6 text-muted-foreground'>
                      {source.customerName} · {source.finishedQty}{' '}
                      {source.finishedUnit} ·{' '}
                      {t(
                        `mrp.productionMaterialIssuance.start.statuses.${source.status}`
                      )}
                    </p>
                    {source.documentId && (
                      <div className='space-y-1 text-xs wrap-anywhere'>
                        <p>
                          {t(
                            'mrp.productionMaterialIssuance.start.alreadyDispatched'
                          )}{' '}
                          {source.documentNo}
                        </p>
                        {matchesPathPermissionProjection(
                          user,
                          '/warehouse/production-material-handovers'
                        ) && (
                          <Link
                            to='/warehouse/production-material-handovers'
                            search={{ documentId: source.documentId }}
                            className={buttonVariants({
                              variant: 'link',
                              size: 'sm',
                            })}
                          >
                            {t(
                              'mrp.productionMaterialIssuance.start.openWarehouseDocument'
                            )}
                          </Link>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
              <span>
                {t('mrp.productionMaterialIssuance.start.sourcePagination', {
                  page: query.page,
                  count: options.data.total,
                })}
              </span>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={query.page <= 1 || options.isFetching}
                  onClick={() => setQuery({ ...query, page: query.page - 1 })}
                >
                  {t('mrp.productionMaterialIssuance.documentList.previous')}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={
                    query.page * query.pageSize >= options.data.total ||
                    options.isFetching
                  }
                  onClick={() => setQuery({ ...query, page: query.page + 1 })}
                >
                  {t('mrp.productionMaterialIssuance.documentList.next')}
                </Button>
              </div>
            </div>
          </>
        )
      )}
      <details
        open
        className='min-w-0 space-y-2 rounded-xl border bg-muted/10 p-3'
      >
        <summary className='text-sm font-medium'>
          {t('mrp.productionMaterialIssuance.start.selected', {
            count: selected.length,
          })}
        </summary>
        <p className='text-xs leading-6 text-muted-foreground'>
          {t('mrp.productionMaterialIssuance.start.selectionHint')}
        </p>
        <ul className='mt-2 space-y-2'>
          {selected.map((source) => (
            <li
              key={source.salesOrderLineId}
              className='flex min-w-0 items-start justify-between gap-3 text-sm'
            >
              <span className='wrap-anywhere'>
                {source.orderNo} / {source.lineNo} · {source.productName}
              </span>
              <Button
                variant='outline'
                size='sm'
                aria-label={t(
                  'mrp.productionMaterialIssuance.start.removeSource',
                  { order: source.orderNo, line: source.lineNo }
                )}
                onClick={() =>
                  workflow.removeProductionMaterialIssuanceSelectedSource(
                    source.salesOrderLineId
                  )
                }
              >
                {t('mrp.productionMaterialIssuance.start.remove')}
              </Button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
