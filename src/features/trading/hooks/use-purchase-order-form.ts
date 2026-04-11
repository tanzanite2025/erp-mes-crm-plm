import { useMemo, useEffect, useCallback } from 'react'
import { useLanguage } from '@/context/language-provider'
import { CurrencyCoreService } from '@/features/finance/services/currency-core-service'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth-store'
import { type PurchaseOrder, type PurchaseOrderLine } from '../data/schema'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { DEFAULT_PURCHASE_ORDER } from './purchase-order-form-defaults'
import {
  appendPurchaseOrderLine,
  createNewPurchaseOrderDraft,
  removePurchaseOrderLine,
  updatePurchaseOrderLine,
  validatePurchaseOrderForm,
} from './purchase-order-form-helpers'
import {
  buildPurchaseOrderCurrencyPatch,
  buildPurchaseOrderHeaderPatch,
  normalizePurchaseOrderCurrencyValue,
  resolvePurchaseOrderExchangeRate,
} from './purchase-order-form-header-helpers'
import { preparePurchaseOrderForSubmit } from './purchase-order-form-submit-helpers'

const logger = createLogger('usePurchaseOrderForm')
type PurchaseOrderLineFieldValue = PurchaseOrderLine[keyof PurchaseOrderLine]
type PurchaseOrderFormState = PurchaseOrder
type PurchaseOrderFormUpdater = PurchaseOrderFormState | ((prev: PurchaseOrderFormState) => PurchaseOrderFormState)

export function usePurchaseOrderForm(initialOrder: PurchaseOrder | null | undefined, open: boolean) {
    const user = useAuthStore((state) => state.user)
    const { t } = useLanguage()
    const purchaserName = user?.username || user?.accountNo || ''
    
    const memoizedInitial = useMemo(() => initialOrder || (DEFAULT_PURCHASE_ORDER as PurchaseOrder), [initialOrder])
    const { data: formData, commit } = useDeltaTracker(memoizedInitial, open)

    const setFormData = useCallback((updater: PurchaseOrderFormUpdater) => {
        if (typeof updater === 'function') {
            const next = updater(formData)
            Object.assign(formData, next)
        } else {
            Object.assign(formData, updater)
        }
    }, [formData])

    const handleHeaderChange = useCallback(async (field: keyof PurchaseOrder, value: PurchaseOrder[keyof PurchaseOrder]) => {
        if (field === 'currency') {
            const currencyValue = normalizePurchaseOrderCurrencyValue(value)
            try {
                const currencies = await CurrencyCoreService.getCurrencies()
                setFormData((prev) => ({
                    ...prev,
                    ...buildPurchaseOrderCurrencyPatch(
                        currencyValue,
                        resolvePurchaseOrderExchangeRate(currencies, currencyValue, prev.exchangeRate)
                    ),
                }))
            } catch (error) {
                logger.error('Failed to fetch exchange rate', error)
                setFormData((prev) => ({
                    ...prev,
                    ...buildPurchaseOrderCurrencyPatch(currencyValue),
                }))
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                ...buildPurchaseOrderHeaderPatch(field, value),
            }))
        }
    }, [setFormData])

    useEffect(() => {
        if (!open || initialOrder) return

        let cancelled = false

        const initializeNewOrder = async () => {
            const defaultCurrency = DEFAULT_PURCHASE_ORDER.currency || 'CNY'
            let defaultExchangeRate = DEFAULT_PURCHASE_ORDER.exchangeRate ?? 1

            try {
                const currencies = await CurrencyCoreService.getCurrencies()
                defaultExchangeRate = resolvePurchaseOrderExchangeRate(currencies, defaultCurrency, defaultExchangeRate) ?? defaultExchangeRate
            } catch (error) {
                logger.error('Failed to hydrate default purchase exchange rate', error)
            }

            if (cancelled) return

            const nextDraft = createNewPurchaseOrderDraft(purchaserName, defaultExchangeRate)
            setFormData((prev) => ({
                ...prev,
                ...nextDraft,
                currency: defaultCurrency,
            }))
        }

        void initializeNewOrder()

        return () => {
            cancelled = true
        }
    }, [open, initialOrder, purchaserName, setFormData])

    const handleAddLine = useCallback(() => {
        setFormData((prev) => {
            const { lines, amount } = appendPurchaseOrderLine(prev.lines || [])
            
            return {
                ...prev,
                lines,
                amount,
            }
        })
    }, [setFormData])

    const handleRemoveLine = useCallback((index: number) => {
        setFormData((prev) => {
            const { lines, amount } = removePurchaseOrderLine(prev.lines || [], index)

            return {
                ...prev,
                lines,
                amount,
            }
        })
    }, [setFormData])

    const updateLine = useCallback(
        (index: number, field: keyof PurchaseOrderLine, value: PurchaseOrderLineFieldValue, extraData?: Partial<PurchaseOrderLine>) => {
            setFormData((prev) => {
                const { lines, amount } = updatePurchaseOrderLine(prev.lines || [], index, field, value, extraData)
                
                return {
                    ...prev,
                    lines,
                    amount,
                }
            })
        },
        [setFormData]
    )

    const validate = (): boolean => {
        return validatePurchaseOrderForm(formData, t, () => {
            logger.error('Validation failed: missing supplierId in formData', formData)
        })
    }

    const prepareSubmitData = useCallback(() => {
        return preparePurchaseOrderForSubmit(formData)
    }, [formData])

    return {
        formData,
        handleHeaderChange,
        handleAddLine,
        handleRemoveLine,
        updateLine,
        validate,
        prepareSubmitData,
        commit,
    }
}
