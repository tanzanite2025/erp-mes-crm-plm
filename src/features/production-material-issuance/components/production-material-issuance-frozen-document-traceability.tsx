import { useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionMaterialIssuanceDocumentListQuery } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'
import type { ProductionMaterialIssuanceWarehouseHandlingIntent } from '../data/production-material-issuance-warehouse-handling-intent'
import {
  useProductionMaterialIssuanceDocumentDetail,
  useProductionMaterialIssuanceDocumentList,
} from '../hooks/use-production-material-issuance-source-review-and-document-queries'
import { ProductionMaterialIssuanceFrozenDocumentVersionedWithdrawalCommandPanel } from './production-material-issuance-frozen-document-versioned-withdrawal-command-panel'
import { ProductionMaterialIssuanceSourceBasisDetails } from './production-material-issuance-source-basis-details'
import { ProductionMaterialIssuanceWarehouseDocumentProgressMovementHistoryAndInlineHandlingSection } from './production-material-issuance-warehouse-document-progress-movement-history-and-inline-handling-section'

export function ProductionMaterialIssuanceFrozenDocumentTraceability({
  allowWithdrawalCommands = true,
  initialDocumentId,
  warehouseHandlingIntent,
  onDocumentSelected,
}: {
  allowWithdrawalCommands?: boolean
  initialDocumentId?: string
  warehouseHandlingIntent?: ProductionMaterialIssuanceWarehouseHandlingIntent
  onDocumentSelected?: (documentId: string | null) => void
}) {
  const { t } = useLanguage()
  const { allowsAction } = usePermissionActions()
  return (
    <section
      aria-labelledby='production-issuance-documents-title'
      className='min-w-0 overflow-hidden rounded-2xl border border-dashed border-muted/50 bg-muted/5 shadow-inner md:rounded-[32px]'
    >
      <div className='space-y-2 border-b border-dashed border-muted/50 bg-muted/30 px-4 py-4 md:px-6'>
        <h2
          id='production-issuance-documents-title'
          className='flex items-center gap-2 text-[10px] font-black tracking-widest text-primary uppercase'
        >
          <ClipboardList
            aria-hidden='true'
            className='size-4 shrink-0 text-primary'
          />
          {t('mrp.productionMaterialIssuance.documentList.title')}
        </h2>
        <p className='max-w-3xl text-[11px] leading-6 font-bold text-muted-foreground/60'>
          {t('mrp.productionMaterialIssuance.documentList.description')}
        </p>
      </div>
      {allowsAction('action_production_material_issuance_view') ? (
        <AuthorizedProductionMaterialIssuanceFrozenDocumentQueries
          key={initialDocumentId ?? 'list'}
          initialDocumentId={initialDocumentId}
          allowWithdrawalCommands={allowWithdrawalCommands}
          warehouseHandlingIntent={warehouseHandlingIntent}
          onDocumentSelected={onDocumentSelected}
        />
      ) : (
        <p className='px-4 py-8 text-center text-[11px] leading-6 font-bold text-muted-foreground md:px-6'>
          {t('mrp.productionMaterialIssuance.documentList.permissionRequired')}
        </p>
      )}
    </section>
  )
}

function AuthorizedProductionMaterialIssuanceFrozenDocumentQueries({
  allowWithdrawalCommands,
  initialDocumentId,
  warehouseHandlingIntent,
  onDocumentSelected,
}: {
  allowWithdrawalCommands: boolean
  initialDocumentId?: string
  warehouseHandlingIntent?: ProductionMaterialIssuanceWarehouseHandlingIntent
  onDocumentSelected?: (documentId: string | null) => void
}) {
  const { t, locale } = useLanguage()
  const [query, setQuery] =
    useState<ProductionMaterialIssuanceDocumentListQuery>({
      status: '',
      page: 1,
      pageSize: 20,
    })
  const [selectedDocumentID, setSelectedDocumentID] = useState<string | null>(
    initialDocumentId ?? null
  )
  const documents = useProductionMaterialIssuanceDocumentList(query)
  const detail = useProductionMaterialIssuanceDocumentDetail(selectedDocumentID)
  function selectProductionMaterialIssuanceOriginalDocument(
    documentId: string | null
  ) {
    setSelectedDocumentID(documentId)
    onDocumentSelected?.(documentId)
  }
  const changeProductionMaterialIssuanceDocumentListPage = (page: number) => {
    selectProductionMaterialIssuanceOriginalDocument(null)
    setQuery((current) => ({ ...current, page }))
  }
  return (
    <div className='space-y-5 p-4 md:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='relative min-w-0'>
          <select
            aria-label={t(
              'mrp.productionMaterialIssuance.documentList.statusFilter'
            )}
            className='h-10 max-w-full min-w-40 appearance-none rounded-full border border-dashed border-muted-foreground/20 bg-background pr-10 pl-4 text-[10px] font-black tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:h-11'
            value={query.status}
            onChange={(event) => {
              const status = event.target.value
              if (
                status !== '' &&
                status !== 'DISPATCHED' &&
                status !== 'WITHDRAWN'
              )
                return
              selectProductionMaterialIssuanceOriginalDocument(null)
              setQuery((current) => ({ ...current, status, page: 1 }))
            }}
          >
            <option value=''>
              {t('mrp.productionMaterialIssuance.documentList.allStatuses')}
            </option>
            <option value='DISPATCHED'>
              {t('mrp.productionMaterialIssuance.documentList.dispatched')}
            </option>
            <option value='WITHDRAWN'>
              {t('mrp.productionMaterialIssuance.documentList.withdrawn')}
            </option>
          </select>
          <ChevronDown
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 right-4 size-3.5 -translate-y-1/2 text-muted-foreground'
          />
        </div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-10 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase active:scale-95 md:h-11 md:px-5'
          disabled={documents.isFetching}
          onClick={() => {
            selectProductionMaterialIssuanceOriginalDocument(null)
            void documents.refetch()
          }}
        >
          <RefreshCw
            aria-hidden='true'
            className={cn('size-3.5', documents.isFetching && 'animate-spin')}
          />
          {t('mrp.productionMaterialIssuance.documentList.refresh')}
        </Button>
      </div>
      {documents.isFetching && (
        <p
          role='status'
          className='text-[11px] font-bold text-muted-foreground'
        >
          {t('mrp.productionMaterialIssuance.documentList.loading')}
        </p>
      )}
      {documents.isError ? (
        <p
          role='alert'
          className='rounded-2xl border border-dashed border-destructive/25 bg-destructive/5 p-4 text-[11px] leading-6 font-bold text-destructive'
        >
          {t('mrp.productionMaterialIssuance.documentList.failed')}{' '}
          {documents.error.message}
        </p>
      ) : (
        documents.data && (
          <>
            {documents.data.items.length === 0 ? (
              <div className='flex min-h-60 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-muted/50 bg-muted/5 px-4 py-10 text-center text-muted-foreground/50'>
                <ClipboardList aria-hidden='true' className='size-8' />
                <p className='text-[10px] leading-6 font-black tracking-widest uppercase'>
                  {t('mrp.productionMaterialIssuance.documentList.empty')}
                </p>
              </div>
            ) : (
              <ul className='grid min-w-0 gap-3 lg:grid-cols-2'>
                {documents.data.items.map((document) => (
                  <li
                    key={document.id}
                    className={cn(
                      'min-w-0 rounded-2xl border border-dashed bg-background/80 p-4 transition-colors',
                      selectedDocumentID === document.id
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-muted/60 hover:border-primary/30 hover:bg-primary/5'
                    )}
                  >
                    <Button
                      type='button'
                      variant='link'
                      className='h-auto w-full min-w-0 justify-between gap-3 p-0 text-left font-maple-ui text-[11px] font-black tracking-wider wrap-anywhere whitespace-normal'
                      disabled={documents.isFetching}
                      aria-expanded={selectedDocumentID === document.id}
                      onClick={() =>
                        selectProductionMaterialIssuanceOriginalDocument(
                          selectedDocumentID === document.id
                            ? null
                            : document.id
                        )
                      }
                    >
                      {document.documentNo}
                      <ChevronDown
                        aria-hidden='true'
                        className={cn(
                          'size-3.5 shrink-0 transition-transform',
                          selectedDocumentID === document.id && 'rotate-180'
                        )}
                      />
                    </Button>
                    <p className='mt-2 text-[10px] leading-6 font-bold text-muted-foreground/60'>
                      {t(
                        document.status === 'DISPATCHED'
                          ? 'mrp.productionMaterialIssuance.documentList.dispatched'
                          : 'mrp.productionMaterialIssuance.documentList.withdrawn'
                      )}{' '}
                      ·{' '}
                      <time dateTime={document.dispatchedAt}>
                        {new Date(document.dispatchedAt).toLocaleString(locale)}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-muted/50 pt-4 text-[10px] font-bold text-muted-foreground/60'>
              <span>
                {t('mrp.productionMaterialIssuance.documentList.pagination', {
                  page: query.page,
                  count: documents.data.total,
                })}
              </span>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
                  disabled={documents.isFetching || query.page <= 1}
                  onClick={() =>
                    changeProductionMaterialIssuanceDocumentListPage(
                      query.page - 1
                    )
                  }
                >
                  <ChevronLeft aria-hidden='true' className='size-3.5' />
                  {t('mrp.productionMaterialIssuance.documentList.previous')}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
                  disabled={
                    documents.isFetching ||
                    query.page * query.pageSize >= documents.data.total
                  }
                  onClick={() =>
                    changeProductionMaterialIssuanceDocumentListPage(
                      query.page + 1
                    )
                  }
                >
                  {t('mrp.productionMaterialIssuance.documentList.next')}
                  <ChevronRight aria-hidden='true' className='size-3.5' />
                </Button>
              </div>
            </div>
          </>
        )
      )}
      {selectedDocumentID && (
        <section
          aria-label={t(
            'mrp.productionMaterialIssuance.documentList.detailTitle'
          )}
          className='space-y-4 rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4 md:rounded-[24px] md:p-5'
        >
          <h3 className='text-[11px] font-black tracking-widest uppercase'>
            {t('mrp.productionMaterialIssuance.documentList.detailTitle')}
          </h3>
          {detail.isFetching && (
            <p role='status' className='text-sm'>
              {t('mrp.productionMaterialIssuance.documentList.loading')}
            </p>
          )}
          {detail.isError ? (
            <p role='alert' className='text-sm text-destructive'>
              {t('mrp.productionMaterialIssuance.documentList.failed')}{' '}
              {detail.error.message}
            </p>
          ) : (
            detail.data &&
            !detail.isFetching && (
              <>
                <p className='font-maple-ui text-xs font-black wrap-anywhere'>
                  {detail.data.document.documentNo} ·{' '}
                  {t(
                    detail.data.document.status === 'DISPATCHED'
                      ? 'mrp.productionMaterialIssuance.documentList.dispatched'
                      : 'mrp.productionMaterialIssuance.documentList.withdrawn'
                  )}
                </p>
                <p className='text-[11px] leading-6 font-bold text-muted-foreground/60'>
                  {t('mrp.productionMaterialIssuance.documentList.frozenHint')}
                </p>
                {detail.data.document.status === 'WITHDRAWN' && (
                  <p className='text-sm wrap-break-word'>
                    {t(
                      'mrp.productionMaterialIssuance.documentList.withdrawalReason'
                    )}
                    : {detail.data.document.withdrawalReason}
                  </p>
                )}
                <ProductionMaterialIssuanceSourceBasisDetails
                  sources={detail.data.sources}
                />
                {allowWithdrawalCommands && (
                  <ProductionMaterialIssuanceFrozenDocumentVersionedWithdrawalCommandPanel
                    document={detail.data.document}
                  />
                )}
              </>
            )
          )}
        </section>
      )}
      {selectedDocumentID &&
        detail.data?.document.id === selectedDocumentID && (
          <ProductionMaterialIssuanceWarehouseDocumentProgressMovementHistoryAndInlineHandlingSection
            key={selectedDocumentID}
            documentId={selectedDocumentID}
            sources={detail.data.sources}
            handlingIntent={warehouseHandlingIntent}
            initiallyOpen={
              !allowWithdrawalCommands ||
              selectedDocumentID === initialDocumentId
            }
          />
        )}
    </div>
  )
}
