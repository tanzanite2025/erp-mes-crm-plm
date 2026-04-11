import { useEffect, useMemo, useState } from 'react'
import { type PaymentMethod, type PaymentTerm } from '@/features/finance/data/schema'
import { PaymentMethodCoreService } from '@/features/finance/services/payment-method-core-service'
import { PaymentTermCoreService } from '@/features/finance/services/payment-term-core-service'
import { createLogger } from '@/lib/logger'
import { type PurchaseOrder } from '../data/schema'

const logger = createLogger('usePurchaseOrderFilterOptions')

export function usePurchaseOrderFilterOptions(orders: PurchaseOrder[]) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])

  useEffect(() => {
    const loadFinanceFilters = async () => {
      try {
        const [paymentMethodData, paymentTermData] = await Promise.all([
          PaymentMethodCoreService.getPaymentMethods(),
          PaymentTermCoreService.getPaymentTerms(),
        ])
        setPaymentMethods(paymentMethodData)
        setPaymentTerms(paymentTermData)
      } catch (error) {
        logger.error('Failed to load purchase order filter options', error)
      }
    }

    void loadFinanceFilters()
  }, [])

  const paymentMethodOptions = useMemo(() => {
    const entries = new Map<string, string>()

    paymentMethods.forEach((item) => {
      if (item.code) entries.set(item.code, item.name || item.code)
    })

    orders.forEach((order) => {
      if (order.paymentMethod) {
        entries.set(
          order.paymentMethod,
          order.paymentMethodName || entries.get(order.paymentMethod) || order.paymentMethod
        )
      }
    })

    return Array.from(entries.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [orders, paymentMethods])

  const paymentTermOptions = useMemo(() => {
    const entries = new Map<string, string>()

    paymentTerms.forEach((item) => {
      if (item.code) entries.set(item.code, item.name || item.code)
    })

    orders.forEach((order) => {
      if (order.paymentTerm) {
        entries.set(
          order.paymentTerm,
          order.paymentTermName || entries.get(order.paymentTerm) || order.paymentTerm
        )
      }
    })

    return Array.from(entries.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [orders, paymentTerms])

  return {
    paymentMethodOptions,
    paymentTermOptions,
  }
}
