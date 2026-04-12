import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { type SalesOrder } from '../../data/schema'
import { useSalesOrderClaimButtonViewModel } from '../../hooks/use-sales-order-claim-button-view-model'
import { getSalesOrderDrawingLabel } from '../../hooks/use-sales-order-drawing-labels'
import { getSalesOrderDrawingTitle } from '../../hooks/use-sales-order-drawing-titles'
import { useSalesOrderDrawingView } from '../../hooks/use-sales-order-drawing-view'
import { useSalesOrderDetailLineRows } from '../../hooks/use-sales-order-detail-line-rows'
import { useSalesOrderDetailTableColumns } from '../../hooks/use-sales-order-detail-table-columns'
import { useSalesOrderDetailViewModel } from '../../hooks/use-sales-order-detail-view-model'
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
  onPreview: (productId: string | undefined, planId: string | undefined, type: DrawingType) => void
}) {
  const { t } = useLanguage()
  const { className: colorClass } = useSalesOrderDrawingView(type)
  const labelText = getSalesOrderDrawingLabel({ type, t })
  const titleText = getSalesOrderDrawingTitle({ type, t })

  return (
    <Button
      variant='outline'
      size='sm'
      className={`h-7 gap-1.5 rounded-lg border px-2 text-[10px] font-black uppercase tracking-tighter transition-all disabled:opacity-30 ${colorClass}`}
      onClick={(event) => {
        event.stopPropagation()
        onPreview(productId, planId, type)
      }}
      title={t('tradingSalesOrder.detail.drawing.previewTitle', { label: titleText })}
    >
      <Eye className='size-3' />
      <span>{labelText}</span>
      {holeCount !== undefined && <span className='font-mono opacity-50'>[{holeCount}H]</span>}
    </Button>
  )
}

interface SalesOrderDetailItemsCardProps {
  order: SalesOrder
  isClaimAction: boolean
  claimOperator: string
  onClaimModel: (model: string) => void
  onClaimLine: (lineNo: number) => void
  onPreview: (productId: string | undefined, planId: string | undefined, type: DrawingType) => void
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
  const { className: claimButtonClassName } = useSalesOrderClaimButtonViewModel(isClaimAction)

  return (
    <Card className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner backdrop-blur-sm'>
      <CardContent className='p-0'>
        <div className='flex items-center justify-between border-b bg-muted/10 px-5 py-2.5'>
          <div className='flex items-center gap-2'>
            <div className='size-1.5 rounded-full bg-primary' />
            <h4 className='text-[10px] font-black uppercase tracking-widest'>
              {t('tradingSalesOrder.detail.itemsTitle')}
            </h4>
          </div>
          <div className='flex items-center gap-2'>
            {order.status === 'Pending' &&
              claimableModels.map((model) => (
                <Button
                  key={model}
                  variant='outline'
                  size='sm'
                  className={claimButtonClassName}
                  onClick={() => onClaimModel(model)}
                >
                  {t('tradingSalesOrder.detail.claimModel')}: {model}
                </Button>
              ))}
          </div>
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
                <tr key={row.key} className='group transition-all hover:bg-primary/5'>
                  <td className='px-3 py-2 text-center font-mono text-[10px] text-muted-foreground/30'>
                    {row.line.lineNo}
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-col'>
                      <span className='text-[11px] font-black tracking-tighter'>{row.line.productModel}</span>
                      <span className='text-[8px] font-mono text-muted-foreground/40'>
                        ID: {row.line.productId || 'UN-REG'}
                      </span>
                    </div>
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-col'>
                      <span
                        className='max-w-[120px] truncate text-[10px] font-bold leading-tight text-foreground/70'
                        title={row.specificationLabel}
                      >
                        {row.specificationLabel}
                      </span>
                      <p
                        className='max-w-[150px] truncate text-[8px] leading-snug text-muted-foreground/40'
                        title={row.descriptionLabel}
                      >
                        {row.descriptionLabel}
                      </p>
                    </div>
                  </td>
                  <td className='px-3 py-2 text-center'>
                    <div className='flex flex-col items-center gap-1 leading-none'>
                      <div className='flex items-baseline gap-0.5'>
                        <span className={`text-[11px] font-black tabular-nums ${row.deliveredTextClass}`}>
                          {row.deliveredQty}
                        </span>
                        <span className='text-[8px] font-bold italic text-muted-foreground/40'>
                          / {row.line.qty.toLocaleString()}
                        </span>
                      </div>
                      <div className='h-1 w-12 overflow-hidden rounded-full border border-muted/20 bg-muted/50'>
                        <div
                          className={`h-full transition-all duration-1000 ${row.deliveredBarClass}`}
                          style={{ width: `${row.deliveredPercent}%` }}
                        />
                      </div>
                      <span className='text-[7px] font-black uppercase opacity-30'>{row.line.uom}</span>
                    </div>
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-col leading-tight'>
                      <div className='flex items-center gap-1'>
                        <span className='text-[7px] font-black opacity-20'>JOB:</span>
                        <span className='text-[9px] font-mono font-bold'>{row.jobNoLabel}</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <span className='text-[7px] font-black opacity-20'>REF:</span>
                        <span className='text-[9px] font-mono font-bold'>{row.customerPartNoLabel}</span>
                      </div>
                    </div>
                  </td>
                  <td className='px-3 py-2 text-center'>
                    <div className='flex flex-col items-center justify-center gap-1'>
                      <DrawingAction productId={row.line.productId} type='spec' onPreview={onPreview} />
                      <DrawingAction
                        planId={row.line.drillingPlanId}
                        holeCount={row.line.holeCount}
                        type='drilling'
                        onPreview={onPreview}
                      />
                      <DrawingAction planId={row.line.labelingPlanId} type='labeling' onPreview={onPreview} />
                    </div>
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-col leading-tight'>
                      <span className='max-w-[60px] truncate text-[9px] font-medium text-foreground/50'>
                        {row.routeLabel || t('tradingSalesOrder.detail.processDefault')}
                      </span>
                    </div>
                  </td>
                  <td className='px-3 py-2 text-center'>
                    <div className='flex flex-col items-center gap-1.5'>
                      <SalesOrderStatusBadge status={row.line.status} />
                      {order.status === 'Pending' && !row.line.claimedBy && (
                        <Button
                          size='sm'
                          variant='secondary'
                          className='h-6 rounded-lg bg-primary/10 px-2 text-[9px] font-black uppercase tracking-tighter text-primary transition-all hover:scale-105 hover:bg-primary hover:text-white active:scale-95'
                          onClick={() => onClaimLine(row.line.lineNo)}
                        >
                          {t('tradingSalesOrder.detail.claimItem')}
                        </Button>
                      )}
                      {row.line.claimedBy && (
                        <div className='flex flex-col items-center opacity-70'>
                          <span className='text-[8px] font-black uppercase tracking-tighter text-emerald-600'>
                            {t('tradingSalesOrder.detail.claimed')}
                          </span>
                          <span className='max-w-[50px] truncate text-[8px] font-bold text-muted-foreground'>
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
          <div className='flex flex-col items-center justify-center py-20 grayscale opacity-20'>
            <div className='mb-4 size-12 rounded-full border-2 border-dashed border-primary' />
            <p className='text-[10px] font-black uppercase tracking-widest'>
              {t('tradingSalesOrder.detail.noExecutionData')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
