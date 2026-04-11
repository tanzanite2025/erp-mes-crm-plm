import { AlertCircle, CheckCheck, Loader2, Package, Printer, Trash2, Truck } from 'lucide-react'
import { useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { AuditStamp } from '@/components/common/audit-stamp'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { type PurchaseOrder } from '../../data/schema'
import { canReceivePurchaseOrder, getPurchaseStatusDisplayMeta } from '../../data/purchase-status'
import { useGetPurchaseOrderDetail, usePurchaseOrderMutations } from '../../purchase'
import { OrderEvidenceGallery } from '../parts/order-evidence-gallery'
import { PurchaseOrderEvidencePrint } from './purchase-order-evidence-print'
import { PurchaseReceiptConfirmDialog } from './purchase-receipt-confirm-dialog'

interface PurchaseOrderDetailProps {
  order?: PurchaseOrder
  onDelete: (id: string) => void
}

export function PurchaseOrderDetail({ order: initialOrder, onDelete }: PurchaseOrderDetailProps) {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const { data: detailedOrder, isLoading: isDetailLoading } = useGetPurchaseOrderDetail(initialOrder?.id || '')
  const { confirmReceiptMutation } = usePurchaseOrderMutations()
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const order = detailedOrder || initialOrder
  const reactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: order ? `${order.orderNo}_purchase_evidence` : 'purchase_evidence',
  })

  if (isDetailLoading) {
    return (
      <div className='flex h-[50vh] flex-col items-center justify-center space-y-3 opacity-50'>
        <Loader2 className='size-10 animate-spin text-primary' />
        <p className='text-xs font-black uppercase tracking-widest italic'>
          {t('purchase.orders.detailLoading')}
        </p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className='flex h-[50vh] flex-col items-center justify-center space-y-3 opacity-20'>
        <AlertCircle className='size-12' />
        <p className='text-xs font-black uppercase tracking-widest'>
          {t('purchase.orders.detailNoSelection')}
        </p>
      </div>
    )
  }

  const handleDelete = () => {
    if (!allowsAction('action_trading_purchase_order_delete')) return
    onDelete(order.id)
  }

  const handleConfirmReceipt = () => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    if (!canReceivePurchaseOrder(order.status)) return
    setIsReceiptDialogOpen(true)
  }

  const statusMeta = getPurchaseStatusDisplayMeta(order.status, t)
  const hasReceivableLines = order.lines.some(
    (line) => ((line.qty || 0) - (line.receivedQty || 0) - (line.returnedQty || 0)) > 0 && !!line.id
  )
  const canConfirmReceipt = canReceivePurchaseOrder(order.status) && hasReceivableLines
  const hasEvidencePhotos = (order.evidences?.length || 0) > 0

  return (
    <div className='mx-auto max-w-5xl space-y-6 p-4 pb-20 md:space-y-8 md:p-6'>
      <div className='hidden'>{order ? <PurchaseOrderEvidencePrint ref={printRef} order={order} /> : null}</div>

      <PurchaseReceiptConfirmDialog
        open={isReceiptDialogOpen}
        onOpenChange={setIsReceiptDialogOpen}
        order={order}
        isSubmitting={confirmReceiptMutation.isPending}
        onConfirm={(payload) => {
          confirmReceiptMutation.mutate(
            { id: order.id, payload },
            {
              onSuccess: () => {
                setIsReceiptDialogOpen(false)
              },
            }
          )
        }}
      />

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4'>
        <Card className='rounded-[28px] border-none bg-muted/30 p-4'>
          <p className='mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
            {t('purchase.orders.detailStats.orderNo')}
          </p>
          <p className='text-sm font-black'>{order.orderNo}</p>
        </Card>
        <Card className='rounded-[28px] border-none bg-muted/30 p-4'>
          <p className='mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
            {t('purchase.orders.detailStats.status')}
          </p>
          <AuditStatusDisplay meta={statusMeta} />
        </Card>
        <Card className='rounded-[28px] border-none bg-muted/30 p-4'>
          <p className='mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
            {t('purchase.orders.detailStats.totalAmount')}
          </p>
          <p className='text-sm font-black text-primary'>
            {order.amount.toLocaleString()} {order.currency}
          </p>
        </Card>
        <Card className='rounded-[28px] border-none bg-muted/30 p-4'>
          <p className='mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
            {t('purchase.orders.detailStats.expectedArrival')}
          </p>
          <p className='text-sm font-black'>{order.expectedDate}</p>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
        <div className='space-y-4 lg:col-span-2'>
          <div className='flex items-center justify-between px-2'>
            <h3 className='flex items-center gap-2 text-sm font-black uppercase tracking-widest'>
              <Package className='size-4 text-primary' />
              {t('purchase.orders.detailItemsTitle')}
            </h3>
          </div>
          <div className='space-y-3'>
            {order.lines.map((line, idx) => (
              <Card
                key={idx}
                className='flex flex-col items-start justify-between gap-4 rounded-[24px] border-none p-4 shadow-sm md:flex-row md:items-center'
              >
                <div className='flex items-center gap-3 md:gap-4'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/5 md:size-10'>
                    <span className='text-[10px] font-black text-primary'>{line.lineNo}</span>
                  </div>
                  <div>
                    <p className='text-[12px] font-black leading-tight md:text-[13px]'>
                      {line.materialName}
                    </p>
                    <p className='mt-0.5 text-[9px] font-bold uppercase text-muted-foreground opacity-60 md:text-[10px]'>
                      {line.materialCode} | {line.specification}
                    </p>
                  </div>
                </div>
                <div className='grid w-full grid-cols-3 gap-4 border-t border-dashed border-primary/10 pt-3 md:mt-0 md:flex md:w-auto md:items-center md:gap-6 md:border-none md:pt-0'>
                  <div className='text-left md:text-right'>
                    <p className='text-[10px] font-black tabular-nums md:text-[11px]'>
                      {line.qty} {line.uom}
                    </p>
                    <p className='text-[8px] font-bold uppercase text-muted-foreground opacity-40 md:text-[10px]'>
                      {t('purchase.orders.detailQty')}
                    </p>
                  </div>
                  <div className='text-center md:text-right'>
                    <p className='text-[10px] font-black tabular-nums md:text-[11px]'>
                      {line.price.toLocaleString()}
                    </p>
                    <p className='text-[8px] font-bold uppercase text-muted-foreground opacity-40 md:text-[10px]'>
                      {t('purchase.orders.detailPrice')}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-[10px] font-black tabular-nums text-primary md:text-[11px]'>
                      {line.amount.toLocaleString()}
                    </p>
                    <p className='text-[8px] font-bold uppercase text-muted-foreground opacity-40 md:text-[10px]'>
                      {t('purchase.orders.detailAmount')}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-[10px] font-black tabular-nums text-emerald-600 md:text-[11px]'>
                      {line.receivedQty || 0} / {line.qty}
                    </p>
                    <p className='text-[8px] font-bold uppercase text-muted-foreground opacity-40 md:text-[10px]'>
                      {t('purchase.orders.detailReceivedQty')}
                    </p>
                    <p className='mt-1 text-[8px] font-bold uppercase text-rose-500/80 md:text-[9px]'>
                      {t('purchase.orders.returns.alreadyReturned')}: {line.returnedQty || 0}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className='space-y-6'>
          <Card className='space-y-4 rounded-[32px] border-none p-6 shadow-sm'>
            <h4 className='flex items-center gap-2 text-[11px] font-black uppercase tracking-tighter'>
              <Truck className='size-3.5 text-primary' />
              {t('purchase.orders.detailSideTitle')}
            </h4>
            <div className='space-y-3 pt-2'>
              <div className='flex items-center justify-between'>
                <span className='text-[11px] font-bold text-muted-foreground'>
                  {t('purchase.orders.detailFields.supplier')}
                </span>
                <span className='text-[11px] font-black'>{order.supplierName}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-[11px] font-bold text-muted-foreground'>
                  {t('purchase.orders.detailFields.purchaser')}
                </span>
                <span className='text-[11px] font-black'>{order.purchaser}</span>
              </div>
              <Separator className='bg-muted/50' />
              <div className='flex items-center justify-between'>
                <span className='text-[11px] font-bold text-muted-foreground'>
                  {t('purchase.orders.detailFields.orderDate')}
                </span>
                <span className='text-[11px] font-black'>{order.orderDate}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-[11px] font-bold text-muted-foreground'>
                  {t('purchase.orders.detailFields.paymentMethod')}
                </span>
                <span
                  className={`text-[11px] font-black ${
                    !order.paymentMethod && !order.paymentMethodName ? 'font-medium italic text-muted-foreground/30' : ''
                  }`}
                >
                  {order.paymentMethodName || order.paymentMethod || t('purchase.orders.detailFields.paymentMethodUnset')}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-[11px] font-bold text-muted-foreground'>
                  {t('purchase.orders.detailFields.paymentTerm')}
                </span>
                <span
                  className={`text-[11px] font-black ${
                    !order.paymentTerm && !order.paymentTermName ? 'font-medium italic text-muted-foreground/30' : ''
                  }`}
                >
                  {order.paymentTermName || order.paymentTerm || t('purchase.orders.detailFields.paymentTermUnset')}
                </span>
              </div>
            </div>

            <OrderEvidenceGallery
              evidences={order.evidences || []}
              titleKey='purchase.orders.detailEvidenceTitle'
              fallbackTitle='Purchase Evidence'
            />
          </Card>

          <Card className='rounded-[32px] border-none p-6 shadow-sm'>
            <AuditStamp
              module={AUDIT_MODULES.purchaseOrder}
              targetId={order.id}
              createdBy={order.createdBy}
              createdAt={order.createdAt}
              updatedBy={order.updatedBy}
              updatedAt={order.updatedAt}
              className='border-primary/10'
            />
          </Card>

          <Button
            variant='outline'
            className='w-full rounded-[24px] py-6 text-[11px] font-black'
            disabled={!hasEvidencePhotos}
            onClick={() => reactToPrint()}
          >
            <Printer className='mr-2 size-4' />
            {t('purchase.orders.detailPrintEvidence')}
          </Button>

          <Button
            className='w-full rounded-[24px] py-6 text-[11px] font-black shadow-lg shadow-primary/10'
            disabled={!canConfirmReceipt || confirmReceiptMutation.isPending}
            onClick={handleConfirmReceipt}
          >
            {confirmReceiptMutation.isPending ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <CheckCheck className='mr-2 size-4' />
            )}
            {t('purchase.orders.detailConfirmReceipt')}
          </Button>

          <Button
            variant='destructive'
            className='w-full rounded-[24px] py-6 text-[11px] font-black shadow-lg shadow-destructive/10'
            disabled={order.status === 'Canceled'}
            onClick={handleDelete}
          >
            <Trash2 className='mr-2 size-4' />
            {t('purchase.orders.detailDelete')}
          </Button>
        </div>
      </div>
    </div>
  )
}
