import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { auditUtils } from '@/lib/audit-utils'
import { useLanguage } from '@/context/language-provider'
import { type SalesOrder } from '../../data/schema'

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
  const { t } = useLanguage()

  return (
    <div className='space-y-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 px-6 py-5 shadow-inner'>
      <div className='grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-4 lg:grid-cols-6'>
        <InfoRow label={t('tradingSalesOrder.detail.info.orderName')} value={order.orderName} />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.orderType')}
          value={
            DictionaryCoreService.getOptions('ORDER_TYPE').find((item) => item.value === order.type)?.label ||
            order.type
          }
        />
        <InfoRow label={t('tradingSalesOrder.detail.info.currency')} value={order.currency} />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.classification')}
          value={
            DictionaryCoreService.getOptions('ORDER_CLASSIFICATION')
              .find((item) => item.value === order.classification)?.label || order.classification
          }
        />
        <InfoRow label={t('tradingSalesOrder.detail.info.orderDate')} value={order.orderDate} />
        <InfoRow
          label={t('tradingSalesOrder.detail.info.deliveryDate')}
          value={order.deliveryDate}
          highlight
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
        <InfoRow label={t('tradingSalesOrder.detail.info.progress')} value={order.statusNote} />
        <InfoRow label={t('tradingSalesOrder.detail.info.orderId')} value={order.id} />
      </div>

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
