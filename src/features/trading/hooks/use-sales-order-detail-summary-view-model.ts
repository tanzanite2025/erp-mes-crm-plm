import { useMemo } from 'react'
import { auditUtils } from '@/lib/audit-utils'
import {
  getSalesOrderClassificationLabel,
  getSalesOrderTypeLabel,
} from '../data/sales-order-options'
import type { SalesOrder } from '../data/schema'
import type { AppLocale } from '@/locales'

interface UseSalesOrderDetailSummaryViewModelParams {
  order: SalesOrder
  locale: AppLocale
  t: (key: string) => string
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

export function useSalesOrderDetailSummaryViewModel({
  order,
  locale,
  t,
}: UseSalesOrderDetailSummaryViewModelParams) {
  return useMemo(() => {
    const infoRows = [
      {
        label: t('tradingSalesOrder.detail.info.orderType'),
        value: getSalesOrderTypeLabel(order.type, locale) || order.type,
      },
      { label: t('tradingSalesOrder.detail.info.currency'), value: order.currency },
      {
        label: t('tradingSalesOrder.detail.info.classification'),
        value: getSalesOrderClassificationLabel(order.classification, locale) || order.classification,
      },
      { label: t('tradingSalesOrder.detail.info.orderDate'), value: order.orderDate },
      { label: t('tradingSalesOrder.detail.info.deliveryDate'), value: order.deliveryDate, highlight: true },
      {
        label: t('tradingSalesOrder.detail.info.paymentMethod'),
        value: order.paymentMethodName || order.paymentMethod,
      },
      {
        label: t('tradingSalesOrder.detail.info.paymentTerm'),
        value: order.paymentTermName || order.paymentTerm,
      },
      {
        label: t('tradingSalesOrder.detail.info.contractAmount'),
        value: `${getCurrencyPrefix(order.currency)}${order.amount?.toLocaleString() || '0.00'}`,
      },
      {
        label: t('tradingSalesOrder.detail.info.totalQuantity'),
        value: `${order.quantity?.toLocaleString() || 0} PCS`,
      },
      {
        label: t('tradingSalesOrder.detail.info.createdBy'),
        value:
          auditUtils.formatOperatorName(order.createdBy) ||
          t('tradingSalesOrder.detail.info.systemImported'),
      },
      {
        label: t('tradingSalesOrder.detail.info.updatedBy'),
        value:
          auditUtils.formatOperatorName(order.updatedBy) ||
          t('tradingSalesOrder.detail.info.originalVersion'),
      },
      { label: t('tradingSalesOrder.detail.info.customerPo'), value: order.purchaseOrderNo },
      { label: t('tradingSalesOrder.detail.info.barcode'), value: order.barcode },
      { label: t('tradingSalesOrder.detail.info.orderId'), value: order.id },
    ]

    return {
      infoRows,
      requirementsText: order.requirements || t('tradingSalesOrder.detail.requirementsEmpty'),
      evidences: order.evidences || [],
    }
  }, [order, locale, t])
}
