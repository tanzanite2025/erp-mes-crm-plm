import type { TranslationKey } from '@/locales'
import { ChevronDown, Clock3, Loader2, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import type { ProductionRoute } from '@/features/production-shared/data/production-route'
import type {
  ProductBarcodeLifecycleCurrentStateApiDTO,
  ProductionOperationExecutionApiDTO,
  ProductBarcodeStateEventApiDTO,
  ProductBarcodeTransferEventApiDTO,
} from '@/features/scan-platform/contracts/production-scan-command-api-dto'
import {
  resolveProductionExecutionLifecycleProcessName,
  resolveProductionExecutionStatusTranslationKey,
} from '../form-utils'
import type { ProductionExecutionProductBarcodeLifecycleHistoryPage } from '../services/production-execution-product-barcode-lifecycle-history-query-service'

const productionExecutionLifecycleActionTranslationKeys: Record<
  string,
  TranslationKey
> = {
  START: 'productionExecution.actions.START',
  COMPLETE: 'productionExecution.actions.COMPLETE',
  HOLD: 'productionExecution.actions.HOLD',
  REWORK: 'productionExecution.actions.REWORK',
}

const productionExecutionLifecycleStateEventTranslationKeys: Record<
  string,
  TranslationKey
> = {
  START: 'productionExecution.actions.START',
  COMPLETE: 'productionExecution.actions.COMPLETE',
  HOLD: 'productionExecution.actions.HOLD',
  REWORK: 'productionExecution.actions.REWORK',
  TRANSFER: 'productionExecution.lifecycle.routeStateChange',
}

const productionExecutionLifecycleTransferTranslationKeys: Record<
  string,
  TranslationKey
> = {
  ROUTE_ADVANCE: 'productionExecution.workflow.routeAdvanceEvent',
  CUSTODY_TRANSFER: 'productionExecution.workflow.custodyTransferEvent',
}

interface ProductionExecutionProductBarcodeLifecycleTimelineEntry {
  key: string
  operation?: ProductionOperationExecutionApiDTO
  stateEvents: ProductBarcodeStateEventApiDTO[]
  transferEvents: ProductBarcodeTransferEventApiDTO[]
  occurredAt: string
  includesCurrentStateEvent: boolean
}

export function ProductionExecutionProductBarcodeLifecycleHistory({
  pages,
  routes,
  currentState,
  isLoading,
  isReadFailed,
  isFetchingNextPage,
  isNextPageError,
  hasNextPage,
  onRetry,
  onLoadMore,
}: {
  pages: Array<ProductionExecutionProductBarcodeLifecycleHistoryPage | null>
  routes: ProductionRoute[]
  currentState?: ProductBarcodeLifecycleCurrentStateApiDTO | null
  isLoading: boolean
  isReadFailed: boolean
  isFetchingNextPage: boolean
  isNextPageError: boolean
  hasNextPage: boolean
  onRetry: () => void
  onLoadMore: () => void
}) {
  const { t } = useLanguage()
  const records = pages.filter(
    (page): page is ProductionExecutionProductBarcodeLifecycleHistoryPage =>
      page !== null
  )
  const timelineEntries =
    buildProductionExecutionProductBarcodeLifecycleTimelineEntries(
      records,
      currentState?.lastEventId ?? ''
    )
  const stateEventTotal = records[0]?.stateEventTotal ?? 0
  const operationExecutionTotal = records[0]?.operationExecutionTotal ?? 0
  const transferEventTotal = records[0]?.transferEventTotal ?? 0

  return (
    <section
      aria-label={t('productionExecution.lifecycle.accessibleTitle')}
      className='min-w-0 space-y-3 border-t pt-3'
    >
      <div className='space-y-1'>
        <h2 className='text-sm font-semibold'>
          {t('productionExecution.lifecycle.title')}
        </h2>
        {currentState && (
          <p className='text-xs break-words text-muted-foreground'>
            {currentState.productName || currentState.productBarcode}
            {' · '}
            {t(
              resolveProductionExecutionStatusTranslationKey(
                currentState.status
              )
            )}
          </p>
        )}
        {records[0] && (
          <p className='flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground'>
            <span>
              {t('productionExecution.lifecycle.stateChanges')}:{' '}
              {stateEventTotal}
            </span>
            <span>
              {t('productionExecution.lifecycle.operations')}:{' '}
              {operationExecutionTotal}
            </span>
            <span>
              {t('productionExecution.lifecycle.transfers')}:{' '}
              {transferEventTotal}
            </span>
          </p>
        )}
      </div>

      {isLoading ? (
        <p
          role='status'
          className='flex items-center gap-2 text-sm text-muted-foreground'
        >
          <Loader2 aria-hidden='true' className='size-4 animate-spin' />
          {t('productionExecution.lifecycle.loading')}
        </p>
      ) : isReadFailed ? (
        <div
          role='alert'
          className='flex flex-wrap items-center justify-between gap-2 text-sm text-destructive'
        >
          <span>{t('productionExecution.lifecycle.readFailed')}</span>
          <Button type='button' size='sm' variant='outline' onClick={onRetry}>
            <RefreshCw aria-hidden='true' className='size-4' />
            {t('productionExecution.lifecycle.retry')}
          </Button>
        </div>
      ) : !currentState ? (
        <p role='status' className='text-sm text-muted-foreground'>
          {t('productionExecution.lifecycle.noRecord')}
        </p>
      ) : timelineEntries.length === 0 ? (
        <p role='status' className='text-sm text-muted-foreground'>
          {t('productionExecution.lifecycle.noEvents')}
        </p>
      ) : (
        <ol className='min-w-0 space-y-0'>
          {timelineEntries.map((entry, index) => (
            <li
              key={entry.key}
              className='relative grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-2 pb-4 last:pb-0'
            >
              <span className='relative flex justify-center'>
                {index < timelineEntries.length - 1 && (
                  <span className='absolute top-2 bottom-[-1rem] w-px bg-border' />
                )}
                <span
                  className={
                    entry.includesCurrentStateEvent
                      ? 'mt-1 size-2 rounded-full bg-primary ring-2 ring-primary/20'
                      : 'mt-1 size-2 rounded-full bg-muted-foreground/50'
                  }
                />
              </span>
              <div className='min-w-0 space-y-1'>
                <div className='flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1'>
                  <div className='min-w-0 space-y-1'>
                    <p className='text-sm font-medium break-words'>
                      {resolveProductionExecutionLifecycleTimelineEntryTitle(
                        entry,
                        t
                      )}
                    </p>
                    {entry.includesCurrentStateEvent && (
                      <p className='text-xs font-medium text-primary'>
                        {t('productionExecution.lifecycle.currentStateEvent')}
                      </p>
                    )}
                  </div>
                  <time className='flex shrink-0 items-center gap-1 text-xs text-muted-foreground'>
                    <Clock3 aria-hidden='true' className='size-3.5' />
                    {formatProductionExecutionLifecycleTimestamp(
                      entry.occurredAt
                    )}
                  </time>
                </div>

                {entry.operation && (
                  <div className='space-y-1 text-xs leading-5 text-muted-foreground'>
                    <p>
                      {t('productionExecution.lifecycle.process')}:{' '}
                      {resolveProductionExecutionLifecycleProcessName(
                        routes,
                        entry.operation.routeId,
                        entry.operation.routeStepId,
                        entry.operation.branchOperationId
                      ) || t('productionExecution.workflow.unknownProcess')}
                    </p>
                    {entry.operation.operator && (
                      <p>
                        {t('productionExecution.lifecycle.operator')}:{' '}
                        {entry.operation.operator}
                      </p>
                    )}
                    {entry.operation.result && (
                      <p>
                        {t('productionExecution.lifecycle.result')}:{' '}
                        {entry.operation.result}
                      </p>
                    )}
                    {entry.operation.notes && (
                      <p className='break-words'>
                        {t('productionExecution.lifecycle.notes')}:{' '}
                        {entry.operation.notes}
                      </p>
                    )}
                  </div>
                )}

                {entry.stateEvents.map((event) => (
                  <p
                    key={'state-' + event.id}
                    className='text-xs leading-5 break-words text-muted-foreground'
                  >
                    {t('productionExecution.lifecycle.stateChange')}:{' '}
                    {resolveProductionExecutionLifecycleStateEventDescription(
                      event,
                      routes,
                      t
                    )}
                    {event.operator ? ' · ' + event.operator : ''}
                  </p>
                ))}

                {entry.transferEvents.map((event) => (
                  <p
                    key={'transfer-' + event.id}
                    className='text-xs leading-5 break-words text-muted-foreground'
                  >
                    {resolveProductionExecutionLifecycleTransferDescription(
                      event,
                      routes,
                      t
                    )}
                    {event.operator ? ' · ' + event.operator : ''}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {isNextPageError && (
        <div
          role='alert'
          className='flex flex-wrap items-center justify-between gap-2 text-sm text-destructive'
        >
          <span>{t('productionExecution.lifecycle.loadMoreFailed')}</span>
          <Button type='button' size='sm' variant='outline' onClick={onRetry}>
            <RefreshCw aria-hidden='true' className='size-4' />
            {t('productionExecution.lifecycle.retry')}
          </Button>
        </div>
      )}

      {hasNextPage && (
        <Button
          type='button'
          size='sm'
          variant='ghost'
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
          className='w-full'
        >
          {isFetchingNextPage ? (
            <Loader2 aria-hidden='true' className='size-4 animate-spin' />
          ) : (
            <ChevronDown aria-hidden='true' className='size-4' />
          )}
          {t(
            isFetchingNextPage
              ? 'productionExecution.lifecycle.loadingMore'
              : 'productionExecution.lifecycle.loadMore'
          )}
        </Button>
      )}
    </section>
  )
}

function buildProductionExecutionProductBarcodeLifecycleTimelineEntries(
  pages: ProductionExecutionProductBarcodeLifecycleHistoryPage[],
  lastEventId: string
): ProductionExecutionProductBarcodeLifecycleTimelineEntry[] {
  const entries = new Map<
    string,
    ProductionExecutionProductBarcodeLifecycleTimelineEntry
  >()
  const seenOperationIDs = new Set<string>()
  const seenStateEventIDs = new Set<string>()
  const seenTransferEventIDs = new Set<string>()

  function getEntry(key: string) {
    const existing = entries.get(key)
    if (existing) return existing
    const created: ProductionExecutionProductBarcodeLifecycleTimelineEntry = {
      key,
      stateEvents: [],
      transferEvents: [],
      occurredAt: '',
      includesCurrentStateEvent: false,
    }
    entries.set(key, created)
    return created
  }

  for (const page of pages) {
    for (const operation of page.operationExecutions) {
      if (seenOperationIDs.has(operation.id)) continue
      seenOperationIDs.add(operation.id)
      getEntry('operation-' + operation.id).operation = operation
    }
    for (const event of page.stateEvents) {
      if (seenStateEventIDs.has(event.id)) continue
      seenStateEventIDs.add(event.id)
      const key = event.operationId
        ? 'operation-' + event.operationId
        : 'state-' + event.id
      const entry = getEntry(key)
      entry.stateEvents.push(event)
      entry.includesCurrentStateEvent ||= event.id === lastEventId
    }
    for (const event of page.transferEvents) {
      if (seenTransferEventIDs.has(event.id)) continue
      seenTransferEventIDs.add(event.id)
      const key = event.operationId
        ? 'operation-' + event.operationId
        : 'transfer-' + event.id
      getEntry(key).transferEvents.push(event)
    }
  }

  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      occurredAt:
        resolveProductionExecutionLifecycleTimelineEntryTimestamp(entry),
    }))
    .sort((left, right) => {
      if (left.includesCurrentStateEvent !== right.includesCurrentStateEvent) {
        return left.includesCurrentStateEvent ? -1 : 1
      }
      const timeDifference =
        Date.parse(right.occurredAt || '') - Date.parse(left.occurredAt || '')
      if (Number.isFinite(timeDifference) && timeDifference !== 0) {
        return timeDifference
      }
      return left.key.localeCompare(right.key)
    })
}

function resolveProductionExecutionLifecycleTimelineEntryTimestamp(
  entry: ProductionExecutionProductBarcodeLifecycleTimelineEntry
) {
  const timestamps = [
    entry.operation?.completedAt,
    entry.operation?.startedAt,
    entry.operation?.createdAt,
    ...entry.stateEvents.map((event) => event.occurredAt),
    ...entry.transferEvents.map((event) => event.occurredAt),
  ].filter((timestamp): timestamp is string => Boolean(timestamp))
  return (
    timestamps.sort((left, right) => Date.parse(left) - Date.parse(right))[
      timestamps.length - 1
    ] ?? ''
  )
}

function resolveProductionExecutionLifecycleTimelineEntryTitle(
  entry: ProductionExecutionProductBarcodeLifecycleTimelineEntry,
  translate: (key: TranslationKey) => string
) {
  if (entry.operation) {
    return translate(
      productionExecutionLifecycleActionTranslationKeys[
        entry.operation.action
      ] ?? 'productionExecution.workflow.unknownStatus'
    )
  }
  const stateEvent = entry.stateEvents[0]
  if (stateEvent) {
    return translate(
      productionExecutionLifecycleStateEventTranslationKeys[
        stateEvent.eventType
      ] ?? 'productionExecution.lifecycle.otherStateEvent'
    )
  }
  const transferEvent = entry.transferEvents[0]
  return translate(
    productionExecutionLifecycleTransferTranslationKeys[
      transferEvent?.transferType ?? ''
    ] ?? 'productionExecution.lifecycle.otherTransfer'
  )
}

function resolveProductionExecutionLifecycleStateEventDescription(
  event: ProductBarcodeStateEventApiDTO,
  routes: ProductionRoute[],
  translate: (key: TranslationKey) => string
) {
  const from = resolveProductionExecutionLifecycleProcessName(
    routes,
    event.routeId,
    '',
    event.fromBranchOperationId
  )
  const to = resolveProductionExecutionLifecycleProcessName(
    routes,
    event.routeId,
    event.routeStepId,
    event.toBranchOperationId
  )
  if (from && to && from !== to) return from + ' → ' + to
  if (to) return to
  return translate(
    productionExecutionLifecycleStateEventTranslationKeys[event.eventType] ??
      'productionExecution.lifecycle.otherStateEvent'
  )
}

function resolveProductionExecutionLifecycleTransferDescription(
  event: ProductBarcodeTransferEventApiDTO,
  routes: ProductionRoute[],
  translate: (key: TranslationKey) => string
) {
  const transferLabel = translate(
    productionExecutionLifecycleTransferTranslationKeys[event.transferType] ??
      'productionExecution.lifecycle.otherTransfer'
  )
  if (event.transferType === 'ROUTE_ADVANCE') {
    const from = resolveProductionExecutionLifecycleProcessName(
      routes,
      event.routeId,
      event.fromRouteStepId,
      event.fromBranchOperationId
    )
    const to = resolveProductionExecutionLifecycleProcessName(
      routes,
      event.routeId,
      event.toRouteStepId,
      event.toBranchOperationId
    )
    return from && to ? transferLabel + ': ' + from + ' → ' + to : transferLabel
  }
  const from = [event.fromHolderType, event.fromHolderId]
    .filter(Boolean)
    .join(' ')
  const to = [event.toHolderType, event.toHolderId].filter(Boolean).join(' ')
  return from && to ? transferLabel + ': ' + from + ' → ' + to : transferLabel
}

function formatProductionExecutionLifecycleTimestamp(timestamp: string) {
  if (!timestamp) return '—'
  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toLocaleString()
}
