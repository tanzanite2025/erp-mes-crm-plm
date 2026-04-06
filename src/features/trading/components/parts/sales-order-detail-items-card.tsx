import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { type SalesOrder } from '../../data/schema'
import { SalesOrderStatusBadge } from './sales-order-status-badge'

type DrawingType = 'spec' | 'drilling' | 'labeling'

function DrawingAction({
  productId,
  planId,
  type,
  label,
  holeCount,
  onPreview,
}: {
  productId?: string
  planId?: string
  type: DrawingType
  label: string
  holeCount?: number
  onPreview: (productId: string | undefined, planId: string | undefined, type: DrawingType) => void
}) {
  const { t } = useLanguage()
  const colorClass =
    type === 'spec'
      ? 'border-blue-200/50 hover:bg-blue-500/10 hover:text-blue-600'
      : type === 'drilling'
        ? 'border-indigo-200/50 hover:bg-indigo-500/10 hover:text-indigo-600'
        : 'border-teal-200/50 text-teal-600 hover:bg-teal-500/10 hover:text-teal-600'

  return (
    <Button
      variant='outline'
      size='sm'
      className={`h-7 gap-1.5 rounded-lg border px-2 text-[10px] font-black uppercase tracking-tighter transition-all disabled:opacity-30 ${colorClass}`}
      onClick={(e) => {
        e.stopPropagation()
        onPreview(productId, planId, type)
      }}
      title={t('tradingSalesOrder.detail.drawing.previewTitle', { label })}
    >
      <Eye className='size-3' />
      <span>{label}</span>
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
  const uniqueClaimableModels = Array.from(
    new Set(order.lines.filter((line) => !line.claimedBy).map((line) => line.productModel))
  )

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
              uniqueClaimableModels.map((model) => (
                <Button
                  key={model}
                  variant='outline'
                  size='sm'
                  className={`h-6 rounded-lg border-primary/30 px-2 text-[9px] font-black text-primary transition-all hover:bg-primary/5 ${
                    isClaimAction ? 'animate-pulse bg-primary/10 shadow-lg ring-2 ring-primary ring-offset-1' : ''
                  }`}
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
                <th className='w-[40px] px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('tradingSalesOrder.detail.headers.no')}
                </th>
                <th className='px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('tradingSalesOrder.detail.headers.product')}
                </th>
                <th className='px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('tradingSalesOrder.detail.headers.snapshot')}
                </th>
                <th className='px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('tradingSalesOrder.detail.headers.shipment')}
                </th>
                <th className='px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('tradingSalesOrder.detail.headers.productionRef')}
                </th>
                <th className='px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('tradingSalesOrder.detail.headers.drawing')}
                </th>
                <th className='px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('tradingSalesOrder.detail.headers.process')}
                </th>
                <th className='px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('tradingSalesOrder.detail.headers.state')}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-muted-foreground/10'>
              {order.lines.map((line) => (
                <tr key={`${order.id}-${line.lineNo}`} className='group transition-all hover:bg-primary/5'>
                  <td className='px-3 py-2 text-center font-mono text-[10px] text-muted-foreground/30'>
                    {line.lineNo}
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-col'>
                      <span className='text-[11px] font-black tracking-tighter'>{line.productModel}</span>
                      <span className='text-[8px] font-mono text-muted-foreground/40'>ID: {line.productId || 'UN-REG'}</span>
                    </div>
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-col'>
                      <span
                        className='max-w-[120px] truncate text-[10px] font-bold leading-tight text-foreground/70'
                        title={line.specification}
                      >
                        {line.specification}
                      </span>
                      <p
                        className='max-w-[150px] truncate text-[8px] leading-snug text-muted-foreground/40'
                        title={line.description}
                      >
                        {line.description}
                      </p>
                    </div>
                  </td>
                  <td className='px-3 py-2 text-center'>
                    <div className='flex flex-col items-center gap-1 leading-none'>
                      <div className='flex items-baseline gap-0.5'>
                        <span
                          className={`text-[11px] font-black tabular-nums ${
                            (line.deliveredQty || 0) > 0 ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {line.deliveredQty || 0}
                        </span>
                        <span className='text-[8px] font-bold italic text-muted-foreground/40'>
                          / {line.qty.toLocaleString()}
                        </span>
                      </div>
                      <div className='h-1 w-12 overflow-hidden rounded-full border border-muted/20 bg-muted/50'>
                        <div
                          className={`h-full transition-all duration-1000 ${
                            (line.deliveredQty || 0) >= line.qty ? 'bg-emerald-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, ((line.deliveredQty || 0) / line.qty) * 100)}%` }}
                        />
                      </div>
                      <span className='text-[7px] font-black uppercase opacity-30'>{line.uom}</span>
                    </div>
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-col leading-tight'>
                      <div className='flex items-center gap-1'>
                        <span className='text-[7px] font-black opacity-20'>JOB:</span>
                        <span className='text-[9px] font-mono font-bold'>{line.jobNo || '-'}</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <span className='text-[7px] font-black opacity-20'>REF:</span>
                        <span className='text-[9px] font-mono font-bold'>{line.customerPartNo || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className='px-3 py-2 text-center'>
                    <div className='flex flex-col items-center justify-center gap-1'>
                      <DrawingAction
                        productId={line.productId}
                        type='spec'
                        label={t('tradingSalesOrder.detail.drawing.spec')}
                        onPreview={onPreview}
                      />
                      <DrawingAction
                        planId={line.drillingPlanId}
                        holeCount={line.holeCount}
                        type='drilling'
                        label={t('tradingSalesOrder.detail.drawing.drilling')}
                        onPreview={onPreview}
                      />
                      <DrawingAction
                        planId={line.labelingPlanId}
                        type='labeling'
                        label={t('tradingSalesOrder.detail.drawing.labeling')}
                        onPreview={onPreview}
                      />
                    </div>
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-col leading-tight'>
                      <span className='max-w-[60px] truncate text-[9px] font-medium text-foreground/50'>
                        {line.route || t('tradingSalesOrder.detail.processDefault')}
                      </span>
                    </div>
                  </td>
                  <td className='px-3 py-2 text-center'>
                    <div className='flex flex-col items-center gap-1.5'>
                      <SalesOrderStatusBadge status={line.status} />
                      {order.status === 'Pending' && !line.claimedBy && (
                        <Button
                          size='sm'
                          variant='secondary'
                          className='h-6 rounded-lg bg-primary/10 px-2 text-[9px] font-black uppercase tracking-tighter text-primary transition-all hover:scale-105 hover:bg-primary hover:text-white active:scale-95'
                          onClick={() => onClaimLine(line.lineNo)}
                        >
                          {t('tradingSalesOrder.detail.claimItem')}
                        </Button>
                      )}
                      {line.claimedBy && (
                        <div className='flex flex-col items-center opacity-70'>
                          <span className='text-[8px] font-black uppercase tracking-tighter text-emerald-600'>
                            {t('tradingSalesOrder.detail.claimed')}
                          </span>
                          <span className='max-w-[50px] truncate text-[8px] font-bold text-muted-foreground'>
                            {line.claimedBy || claimOperator}
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
