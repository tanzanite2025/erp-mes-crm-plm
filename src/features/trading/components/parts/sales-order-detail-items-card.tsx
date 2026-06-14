import { Eye, ImageIcon } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { type SalesOrder } from '../../data/schema'
import { useSalesOrderClaimButtonViewModel } from '../../hooks/use-sales-order-claim-button-view-model'
import { useSalesOrderDetailLineRows } from '../../hooks/use-sales-order-detail-line-rows'
import { useSalesOrderDetailTableColumns } from '../../hooks/use-sales-order-detail-table-columns'
import { useSalesOrderDetailViewModel } from '../../hooks/use-sales-order-detail-view-model'
import { getSalesOrderDrawingLabel } from '../../hooks/use-sales-order-drawing-labels'
import { getSalesOrderDrawingTitle } from '../../hooks/use-sales-order-drawing-titles'
import { useSalesOrderDrawingView } from '../../hooks/use-sales-order-drawing-view'
import { SalesOrderStatusBadge } from './sales-order-status-badge'

type DrawingType = 'spec' | 'drilling' | 'labeling'

function DrawingAction({
  productId,
  planId,
  type,
  holeCount,
  onPreview,
}: {
  productId?: string
  planId?: string
  type: DrawingType
  holeCount?: number
  onPreview: (
    productId: string | undefined,
    planId: string | undefined,
    type: DrawingType
  ) => void
}) {
  const { t } = useLanguage()
  const { className: colorClass } = useSalesOrderDrawingView(type)
  const labelText = getSalesOrderDrawingLabel({ type, t })
  const titleText = getSalesOrderDrawingTitle({ type, t })

  return (
    <Button
      variant='outline'
      size='sm'
      className={`h-7 gap-1.5 rounded-lg border px-2 text-[10px] font-black tracking-normal uppercase transition-all disabled:opacity-30 ${colorClass}`}
      onClick={(event) => {
        event.stopPropagation()
        onPreview(productId, planId, type)
      }}
      title={t('tradingSalesOrder.detail.drawing.previewTitle', {
        label: titleText,
      })}
    >
      <Eye className='size-3' />
      <span>{labelText}</span>
      {holeCount !== undefined && (
        <span className='font-mono opacity-50'>[{holeCount}H]</span>
      )}
    </Button>
  )
}

interface SalesOrderDetailItemsCardProps {
  order: SalesOrder
  isClaimAction: boolean
  claimOperator: string
  onClaimModel: (model: string) => void
  onClaimLine: (lineNo: number) => void
  onPreview: (
    productId: string | undefined,
    planId: string | undefined,
    type: DrawingType
  ) => void
}

export function SalesOrderDetailItemsCard({
  order,
  isClaimAction,
  claimOperator,
  onClaimModel,
  onClaimLine,
  onPreview,
}: SalesOrderDetailItemsCardProps) {
  const { t } = useLanguage()
  const { claimableModels } = useSalesOrderDetailViewModel(order)
  const lineRows = useSalesOrderDetailLineRows(order)
  const columns = useSalesOrderDetailTableColumns(t)
  const { className: claimButtonClassName } =
    useSalesOrderClaimButtonViewModel(isClaimAction)
  const hasClaimActions =
    order.status === 'Pending' && claimableModels.length > 0

  return (
    <section className='overflow-hidden rounded-xl border border-dashed border-muted/50 bg-background/80'>
      <div className='flex flex-wrap items-center gap-1.5 border-b bg-muted/10 px-2 py-1'>
        <span className='mr-auto text-[10px] font-black tracking-wide text-muted-foreground/60 uppercase'>
          {t('tradingSalesOrder.detail.itemsTitle')}
        </span>
        {hasClaimActions &&
          claimableModels.map((model) => (
            <Button
              key={model}
              variant='outline'
              size='sm'
              className={`${claimButtonClassName} h-6 px-2 text-[10px]`}
              onClick={() => onClaimModel(model)}
            >
              {t('tradingSalesOrder.detail.claimModel')}: {model}
            </Button>
          ))}
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full border-collapse text-left'>
          <thead>
            <tr className='border-b bg-muted/5'>
              {columns.map((column) => (
                <th key={column.key} className={column.className}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-muted-foreground/10'>
            {lineRows.map((row) => (
              <tr
                key={row.key}
                className='group transition-all hover:bg-primary/5'
              >
                <td className='px-2 py-1 text-center font-mono text-[10px] text-muted-foreground/40'>
                  {row.line.lineNo}
                </td>
                <td className='px-2 py-1'>
                  <div className='flex flex-col'>
                    <span className='text-[12px] font-black tracking-tight'>
                      {row.displayTitle}
                    </span>
                    <span className='font-mono text-[9px] text-muted-foreground/50'>
                      ID: {row.line.productId || 'UN-REG'}
                    </span>
                  </div>
                </td>
                <td className='px-2 py-1'>
                  <div className='flex flex-col gap-1'>
                    <div className='flex flex-col'>
                      <span
                        className='max-w-[120px] truncate text-[11px] leading-tight font-black text-foreground/80'
                        title={row.displaySubtitle}
                      >
                        {row.displaySubtitle}
                      </span>
                      <p
                        className='max-w-[150px] truncate text-[10px] leading-snug text-muted-foreground/50'
                        title={row.descriptionLabel}
                      >
                        {row.descriptionLabel}
                      </p>
                    </div>
                    <div className='flex items-center gap-1.5 rounded-md border border-dashed bg-muted/10 px-1.5 py-0.5'>
                      <div className='flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background'>
                        {row.appearanceImageUrl ? (
                          <img
                            src={row.appearanceImageUrl}
                            alt={row.appearanceNameLabel || 'appearance'}
                            className='size-full object-cover'
                          />
                        ) : (
                          <ImageIcon className='size-3.5 text-muted-foreground/20' />
                        )}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-[10px] font-black'>
                          {row.appearanceNameLabel ||
                            t(
                              'tradingSalesOrder.detail.snapshotMeta.appearanceEmpty'
                            )}
                        </div>
                        <div className='truncate text-[9px] text-muted-foreground'>
                          {row.appearanceCodeLabel
                            ? `${t('tradingSalesOrder.detail.snapshotMeta.appearanceCode')}: ${row.appearanceCodeLabel}`
                            : t(
                                'tradingSalesOrder.detail.snapshotMeta.appearanceEmpty'
                              )}
                        </div>
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      <span className='rounded-full border border-dashed bg-background px-2 py-0.5 text-[9px] font-black tracking-normal text-foreground/70'>
                        {t('tradingSalesOrder.detail.snapshotMeta.modelCode')}:{' '}
                        {row.modelCodeSnapshotLabel || '--'}
                      </span>
                      <span className='rounded-full border border-dashed bg-background px-2 py-0.5 text-[9px] font-black tracking-normal text-foreground/70'>
                        {t('tradingSalesOrder.detail.snapshotMeta.holePrefix')}:{' '}
                        {row.holePrefixSnapshotLabel || '--'}
                      </span>
                      <span className='rounded-full border border-dashed bg-background px-2 py-0.5 text-[9px] font-black tracking-normal text-foreground/70'>
                        {t('tradingSalesOrder.detail.snapshotMeta.holeCount')}:{' '}
                        {row.holeCountLabel || '--'}
                      </span>
                      <span className='rounded-full border border-dashed bg-background px-2 py-0.5 text-[9px] font-black tracking-normal text-foreground/70'>
                        {t('tradingSalesOrder.detail.snapshotMeta.quantity')}:{' '}
                        {row.quantityLabel} {row.line.uom}
                      </span>
                    </div>
                  </div>
                </td>
                <td className='px-2 py-1 text-center'>
                  <div className='flex flex-col items-center gap-1 leading-none'>
                    <div className='flex items-baseline gap-0.5'>
                      <span
                        className={`text-[12px] font-black tabular-nums ${row.deliveredTextClass}`}
                      >
                        {row.deliveredQty}
                      </span>
                      <span className='text-[10px] font-bold text-muted-foreground/50'>
                        / {row.line.qty.toLocaleString()}
                      </span>
                    </div>
                    <div className='h-1 w-12 overflow-hidden rounded-full border border-muted/20 bg-muted/50'>
                      <div
                        className={`h-full transition-all duration-1000 ${row.deliveredBarClass}`}
                        style={{ width: `${row.deliveredPercent}%` }}
                      />
                    </div>
                    <span className='text-[9px] font-black uppercase opacity-40'>
                      {row.line.uom}
                    </span>
                  </div>
                </td>
                <td className='px-2 py-1 text-center'>
                  <div className='flex flex-col items-center justify-center gap-0.5'>
                    <DrawingAction
                      productId={row.line.productId}
                      type='spec'
                      onPreview={onPreview}
                    />
                    <DrawingAction
                      planId={row.line.drillingPlanId}
                      holeCount={row.line.holeCount}
                      type='drilling'
                      onPreview={onPreview}
                    />
                    <DrawingAction
                      planId={row.line.labelingPlanId}
                      type='labeling'
                      onPreview={onPreview}
                    />
                  </div>
                </td>
                <td className='px-2 py-1'>
                  <div className='flex flex-col leading-tight'>
                    <span className='max-w-[60px] truncate text-[10px] font-bold text-foreground/60'>
                      {row.routeLabel ||
                        t('tradingSalesOrder.detail.processDefault')}
                    </span>
                  </div>
                </td>
                <td className='px-2 py-1 text-center'>
                  <div className='flex flex-col items-center gap-1'>
                    <SalesOrderStatusBadge status={row.line.status} />
                    {order.status === 'Pending' && !row.line.claimedBy && (
                      <Button
                        size='sm'
                        variant='secondary'
                        className='h-6 rounded-lg bg-primary/10 px-2 text-[10px] font-black tracking-normal text-primary uppercase transition-all hover:scale-105 hover:bg-primary hover:text-white active:scale-95'
                        onClick={() => onClaimLine(row.line.lineNo)}
                      >
                        {t('tradingSalesOrder.detail.claimItem')}
                      </Button>
                    )}
                    {row.line.claimedBy && (
                      <div className='flex flex-col items-center opacity-70'>
                        <span className='text-[9px] font-black tracking-normal text-emerald-600 uppercase'>
                          {t('tradingSalesOrder.detail.claimed')}
                        </span>
                        <span className='max-w-[50px] truncate text-[9px] font-bold text-muted-foreground'>
                          {row.line.claimedBy || claimOperator}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(!order.lines || order.lines.length === 0) && (
        <div className='flex flex-col items-center justify-center py-8 opacity-20 grayscale'>
          <div className='mb-2 size-8 rounded-full border-2 border-dashed border-primary' />
          <p className='text-[10px] font-black tracking-wide uppercase'>
            {t('tradingSalesOrder.detail.noExecutionData')}
          </p>
        </div>
      )}
    </section>
  )
}
