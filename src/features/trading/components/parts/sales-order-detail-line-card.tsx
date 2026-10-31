import { Eye, ImageIcon } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import type { SalesOrderLineRow } from '../../hooks/use-sales-order-detail-line-rows'
import { getSalesOrderDrawingLabel } from '../../hooks/use-sales-order-drawing-labels'
import { getSalesOrderDrawingTitle } from '../../hooks/use-sales-order-drawing-titles'
import { useSalesOrderDrawingView } from '../../hooks/use-sales-order-drawing-view'
import { SalesOrderStatusBadge } from './sales-order-status-badge'

type SalesOrderDrawingType = 'spec' | 'drilling' | 'labeling'
type SalesOrderDrawingPreviewHandler = (
  productId: string | undefined,
  planId: string | undefined,
  type: SalesOrderDrawingType
) => void

function SalesOrderDrawingPreviewButton({
  row,
  type,
  onPreview,
}: {
  row: SalesOrderLineRow
  type: SalesOrderDrawingType
  onPreview: SalesOrderDrawingPreviewHandler
}) {
  const { t } = useLanguage()
  const { className } = useSalesOrderDrawingView(type)
  const planId =
    type === 'drilling' ? row.line.drillingPlanId : row.line.labelingPlanId

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={`min-h-9 gap-1.5 rounded-lg px-2 text-sm font-medium ${className}`}
      onClick={() =>
        onPreview(
          type === 'spec' ? row.line.productId : undefined,
          type === 'spec' ? undefined : planId,
          type
        )
      }
      title={t('tradingSalesOrder.detail.drawing.previewTitle', {
        label: getSalesOrderDrawingTitle({ type, t }),
      })}
    >
      <Eye className='size-4 shrink-0' />
      {getSalesOrderDrawingLabel({ type, t })}
      {type === 'drilling' && row.line.holeCount !== undefined && (
        <span className='text-xs text-muted-foreground'>
          {row.line.holeCount}H
        </span>
      )}
    </Button>
  )
}

function SalesOrderProductSnapshotInformationField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className='flex min-w-0 items-baseline gap-1.5'>
      <dt className='shrink-0 text-xs leading-5 text-muted-foreground'>
        {label}
      </dt>
      <dd className='min-w-0 text-sm leading-5 [overflow-wrap:anywhere]'>
        {value || '—'}
      </dd>
    </div>
  )
}

export function SalesOrderDetailLineCard({
  row,
  canClaimLine,
  claimOperator,
  onClaimLine,
  onPreview,
}: {
  row: SalesOrderLineRow
  canClaimLine: boolean
  claimOperator: string
  onClaimLine: (lineNo: number) => void
  onPreview: SalesOrderDrawingPreviewHandler
}) {
  const { t, locale } = useLanguage()

  return (
    <li className='min-w-0 overflow-hidden rounded-xl border border-border bg-card'>
      <div className='flex min-w-0 flex-col justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center'>
        <div className='min-w-0'>
          <div className='flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1'>
            <p className='shrink-0 text-xs leading-5 text-muted-foreground'>
              {t('tradingSalesOrder.detail.readingLayout.lineNumber', {
                lineNo: row.line.lineNo,
              })}
            </p>
            <h3 className='min-w-0 text-sm leading-6 font-semibold [overflow-wrap:anywhere]'>
              {row.displayTitle}
            </h3>
          </div>
          {row.line.productCode && (
            <p className='text-xs leading-5 [overflow-wrap:anywhere] text-muted-foreground'>
              {t('tradingSalesOrder.detail.readingLayout.productCode')}:{' '}
              {row.line.productCode}
            </p>
          )}
        </div>
        <div className='flex min-w-0 flex-wrap items-center gap-2 sm:justify-end'>
          <SalesOrderStatusBadge status={row.line.status} />
          {canClaimLine && (
            <Button
              type='button'
              size='sm'
              variant='secondary'
              className='min-h-9 rounded-lg px-3 text-sm font-medium'
              onClick={() => onClaimLine(row.line.lineNo)}
            >
              {t('tradingSalesOrder.detail.claimItem')}
            </Button>
          )}
          {row.line.claimedBy && (
            <p className='text-sm leading-6 [overflow-wrap:anywhere] text-muted-foreground'>
              <span className='mr-1.5 text-emerald-700 dark:text-emerald-400'>
                {t('tradingSalesOrder.detail.claimed')}
              </span>
              {row.line.claimedBy || claimOperator}
            </p>
          )}
        </div>
      </div>
      <div className='grid min-w-0 gap-x-5 gap-y-3 p-3 sm:grid-cols-2 @5xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,0.75fr)_minmax(0,1.3fr)]'>
        <section className='min-w-0 space-y-2'>
          <h4 className='text-xs leading-5 font-medium text-muted-foreground'>
            {t('tradingSalesOrder.detail.readingLayout.productDetails')}
          </h4>
          <div className='space-y-1'>
            <p className='text-sm leading-5 [overflow-wrap:anywhere]'>
              {row.displaySubtitle}
            </p>
            {row.descriptionLabel && (
              <p className='text-sm leading-5 [overflow-wrap:anywhere] text-muted-foreground'>
                {row.descriptionLabel}
              </p>
            )}
          </div>
          <dl className='flex min-w-0 flex-wrap gap-x-4 gap-y-1'>
            <SalesOrderProductSnapshotInformationField
              label={t('tradingSalesOrder.detail.snapshotMeta.modelCode')}
              value={row.modelCodeSnapshotLabel}
            />
            <SalesOrderProductSnapshotInformationField
              label={t('tradingSalesOrder.detail.snapshotMeta.holePrefix')}
              value={row.holePrefixSnapshotLabel}
            />
            <SalesOrderProductSnapshotInformationField
              label={t('tradingSalesOrder.detail.snapshotMeta.holeCount')}
              value={row.holeCountLabel}
            />
          </dl>
        </section>
        <section className='min-w-0 space-y-2'>
          <h4 className='text-xs leading-5 font-medium text-muted-foreground'>
            {t('tradingSalesOrder.detail.snapshotMeta.appearance')}
          </h4>
          <div className='flex min-w-0 items-start gap-2'>
            <div className='flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background'>
              {row.appearanceImageUrl ? (
                <img
                  src={row.appearanceImageUrl}
                  alt={
                    row.appearanceNameLabel ||
                    t('tradingSalesOrder.detail.snapshotMeta.appearance')
                  }
                  className='size-full object-cover'
                />
              ) : (
                <ImageIcon className='size-5 text-muted-foreground' />
              )}
            </div>
            <div className='min-w-0 space-y-1 [overflow-wrap:anywhere]'>
              <p className='text-sm leading-5 font-medium'>
                {row.appearanceNameLabel ||
                  t('tradingSalesOrder.detail.snapshotMeta.appearanceEmpty')}
              </p>
              {row.appearanceCodeLabel && (
                <p className='text-xs leading-5 text-muted-foreground'>
                  {t('tradingSalesOrder.detail.snapshotMeta.appearanceCode')}:{' '}
                  {row.appearanceCodeLabel}
                </p>
              )}
              {row.appearanceDescriptionLabel && (
                <p className='text-sm leading-5 text-muted-foreground'>
                  {row.appearanceDescriptionLabel}
                </p>
              )}
            </div>
          </div>
        </section>
        <section className='min-w-0 space-y-2'>
          <h4 className='text-xs leading-5 font-medium text-muted-foreground'>
            {t('tradingSalesOrder.detail.readingLayout.fulfillment')}
          </h4>
          <div className='space-y-1.5'>
            <p className='text-xs leading-5 text-muted-foreground'>
              {t('tradingSalesOrder.detail.readingLayout.shippedQuantity')}
            </p>
            <p className='text-base leading-6 font-semibold tabular-nums'>
              <span className={row.deliveredTextClass}>
                {row.deliveredQty.toLocaleString(locale)}
              </span>
              <span className='ml-2 text-sm font-normal text-muted-foreground'>
                / {row.line.qty.toLocaleString(locale)} {row.line.uom}
              </span>
            </p>
            <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
              <div
                className={`h-full ${row.deliveredBarClass}`}
                style={{ width: `${row.deliveredPercent}%` }}
              />
            </div>
          </div>
        </section>
        <section className='min-w-0 space-y-2'>
          <h4 className='text-xs leading-5 font-medium text-muted-foreground'>
            {t('tradingSalesOrder.detail.readingLayout.documentsAndProcess')}
          </h4>
          <div className='text-sm leading-5 [overflow-wrap:anywhere]'>
            <span className='mr-2 text-xs text-muted-foreground'>
              {t('tradingSalesOrder.detail.headers.process')}
            </span>
            <span>
              {row.routeLabel || t('tradingSalesOrder.detail.processDefault')}
            </span>
          </div>
          <div className='flex min-w-0 flex-wrap gap-2'>
            <SalesOrderDrawingPreviewButton
              row={row}
              type='spec'
              onPreview={onPreview}
            />
            <SalesOrderDrawingPreviewButton
              row={row}
              type='drilling'
              onPreview={onPreview}
            />
            <SalesOrderDrawingPreviewButton
              row={row}
              type='labeling'
              onPreview={onPreview}
            />
          </div>
        </section>
      </div>
    </li>
  )
}
