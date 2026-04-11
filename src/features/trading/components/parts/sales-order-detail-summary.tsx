import { auditUtils } from '@/lib/audit-utils'
import { useLanguage } from '@/context/language-provider'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { type SalesOrder, type OrderEvidence } from '../../data/schema'
import {
  getSalesOrderClassificationLabel,
  getSalesOrderTypeLabel,
} from '../../data/sales-order-options'
import { ImageIcon, Loader2 } from 'lucide-react'

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value?: string | number
  highlight?: boolean
}) {
  return (
    <div className='group flex min-w-[80px] flex-col'>
      <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 transition-colors group-hover:text-primary'>
        {label}
      </span>
      <span
        className={`truncate text-[12px] font-black tracking-tight ${
          highlight ? 'text-primary' : 'text-foreground/90'
        }`}
      >
        {value || '-'}
      </span>
    </div>
  )
}

function EvidenceGallery({ evidences }: { evidences: OrderEvidence[] }) {
  const { t } = useLanguage()

  if (!evidences || evidences.length === 0) return null

  return (
    <div className='mt-6 border-t border-muted-foreground/10 pt-4'>
      <div className='flex items-center gap-2 mb-3'>
        <ImageIcon className='size-3.5 text-primary' />
        <h4 className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 italic'>
          {t('tradingSalesOrder.detail.evidenceTitle') || '订单凭据 (Order Evidence)'}
        </h4>
      </div>
      <div className='flex flex-wrap gap-4'>
        {evidences.map((ev) => (
          <div
            key={ev.id}
            className='group relative size-20 overflow-hidden rounded-xl border bg-background shadow-sm transition-all hover:ring-2 hover:ring-primary/20'
          >
            {ev.url ? (
              <a href={getStaticEvidenceUrl(ev.url)} target='_blank' rel='noreferrer'>
                <img
                  src={getStaticEvidenceUrl(ev.url)}
                  alt={ev.name}
                  className='size-full object-cover transition-transform group-hover:scale-110'
                />
              </a>
            ) : (
              <div className='flex size-full items-center justify-center'>
                <Loader2 className='size-4 animate-spin text-muted-foreground/20' />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function getCurrencyPrefix(currency?: string) {
  switch ((currency || '').toUpperCase()) {
    case 'USD':
      return '$'
    case 'EUR':
      return 'EUR '
    case 'GBP':
      return 'GBP '
    case 'JPY':
      return 'JPY '
    case 'CNY':
      return 'CNY '
    default:
      return currency ? `${currency} ` : ''
  }
}

export function SalesOrderDetailSummary({ order }: { order: SalesOrder }) {
  const { t, locale } = useLanguage()

  return (
    <div className='space-y-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 px-6 py-5 shadow-inner'>
      <div className='grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-4 lg:grid-cols-6'>
        <InfoRow
          label={t('tradingSalesOrder.detail.info.orderType')}
          value={getSalesOrderTypeLabel(order.type, locale) || order.type}
        />
        <InfoRow label={t('tradingSalesOrder.detail.info.currency')} value={order.currency} />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.classification')}
          value={getSalesOrderClassificationLabel(order.classification, locale) || order.classification}
        />
        <InfoRow label={t('tradingSalesOrder.detail.info.orderDate')} value={order.orderDate} />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.deliveryDate')}
          value={order.deliveryDate}
          highlight
        />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.paymentMethod')}
          value={order.paymentMethodName || order.paymentMethod}
        />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.paymentTerm')}
          value={order.paymentTermName || order.paymentTerm}
        />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.contractAmount')}
          value={`${getCurrencyPrefix(order.currency)}${order.amount?.toLocaleString() || '0.00'}`}
        />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.totalQuantity')}
          value={`${order.quantity?.toLocaleString() || 0} PCS`}
        />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.createdBy')}
          value={
            auditUtils.formatOperatorName(order.createdBy) ||
            t('tradingSalesOrder.detail.info.systemImported')
          }
        />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.updatedBy')}
          value={
            auditUtils.formatOperatorName(order.updatedBy) ||
            t('tradingSalesOrder.detail.info.originalVersion')
          }
        />
        <InfoRow label={t('tradingSalesOrder.detail.info.customerPo')} value={order.purchaseOrderNo} />
        <InfoRow label={t('tradingSalesOrder.detail.info.barcode')} value={order.barcode} />
        <InfoRow label={t('tradingSalesOrder.detail.info.orderId')} value={order.id} />
      </div>

      <EvidenceGallery evidences={order.evidences || []} />

      <div className='border-t border-muted-foreground/10 pt-4'>
        <div className='flex items-start gap-3'>
          <div className='size-1.5 shrink-0 translate-y-1.5 rounded-full bg-primary/40' />
          <div className='space-y-1.5'>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none'>
              {t('tradingSalesOrder.detail.requirementsTitle')}
            </p>
            <p className='text-[12px] font-medium leading-relaxed text-foreground/80'>
              {order.requirements || t('tradingSalesOrder.detail.requirementsEmpty')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
