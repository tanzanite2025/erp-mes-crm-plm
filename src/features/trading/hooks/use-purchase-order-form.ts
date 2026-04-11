import { useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { CurrencyCoreService } from '@/features/finance/services/currency-core-service'
import { type Currency } from '@/features/finance/data/schema'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth-store'
import { type PurchaseOrder, type PurchaseOrderLine } from '../data/schema'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { previewLineAmount, previewOrderTotals } from '../utils/sales-order-calc'

const logger = createLogger('usePurchaseOrderForm')
type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]
type PurchaseOrderLineFieldValue = PurchaseOrderLine[keyof PurchaseOrderLine]
type PurchaseOrderFormState = PurchaseOrder
type PurchaseOrderFormUpdater = PurchaseOrderFormState | ((prev: PurchaseOrderFormState) => PurchaseOrderFormState)

const emptyLine: Partial<PurchaseOrderLine> = {
    lineNo: 1,
    materialName: '',
    materialCode: '',
    specification: '',
    qty: 0,
    price: 0,
    amount: 0,
    uom: 'PCS',
    status: 'Draft',
    expectedDate: new Date().toISOString().split('T')[0],
}

const DEFAULT_PURCHASE_ORDER: Partial<PurchaseOrder> = {
    orderNo: '',
    supplierName: '',
    supplierId: '',
    currency: 'CNY',
    exchangeRate: 1.0,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    status: 'Draft',
    lines: [],
    amount: 0,
    purchaser: '',
    paymentMethod: '',
    paymentMethodName: '',
    paymentTerm: '',
    paymentTermName: '',
    note: '',
    version: 1,
}

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

    const handleHeaderChange = useCallback(async (field: keyof PurchaseOrder, value: PurchaseOrderFieldValue) => {
        if (field === 'currency') {
            try {
                const currencies = await CurrencyCoreService.getCurrencies()
                const currencyValue = typeof value === 'string' ? value : String(value ?? '')
                const target = currencies.find((c: Currency) => c.code === currencyValue)
                setFormData((prev) => ({
                    ...prev,
                    currency: currencyValue,
                    exchangeRate: target?.rate ?? prev.exchangeRate,
                }))
            } catch (error) {
                logger.error('Failed to fetch exchange rate', error)
                const currencyValue = typeof value === 'string' ? value : String(value ?? '')
                setFormData((prev) => ({
                    ...prev,
                    currency: currencyValue,
                }))
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                [field]: value,
            } as PurchaseOrder))
        }
    }, [setFormData])

    useEffect(() => {
        if (!open || initialOrder) return

        let cancelled = false

        const initializeNewOrder = async () => {
            const newId = `PO${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`
            const defaultCurrency = DEFAULT_PURCHASE_ORDER.currency || 'CNY'
            let defaultExchangeRate = DEFAULT_PURCHASE_ORDER.exchangeRate ?? 1

            try {
                const currencies = await CurrencyCoreService.getCurrencies()
                const matchedCurrency = currencies.find((currency: Currency) => currency.code === defaultCurrency)
                if (matchedCurrency) {
                    defaultExchangeRate = matchedCurrency.rate
                }
            } catch (error) {
                logger.error('Failed to hydrate default purchase exchange rate', error)
            }

            if (cancelled) return

            setFormData((prev) => ({
                ...prev,
                id: newId,
                orderNo: newId,
                orderDate: new Date().toISOString().split('T')[0],
                purchaser: purchaserName,
                currency: defaultCurrency,
                exchangeRate: defaultExchangeRate,
                lines: [{ ...emptyLine, lineNo: 1 } as PurchaseOrderLine],
            }))
        }

        void initializeNewOrder()

        return () => {
            cancelled = true
        }
    }, [open, initialOrder, purchaserName, setFormData])

    const handleAddLine = useCallback(() => {
        setFormData((prev) => {
            const nextLines = [...(prev.lines || []), { ...emptyLine, lineNo: (prev.lines?.length || 0) + 1 } as PurchaseOrderLine]
            
            // [PREVIEW-ONLY] 重新计算预览统计
            const { lines: reindexedLines, amount } = previewOrderTotals(nextLines)
            
            return {
                ...prev,
                lines: reindexedLines as PurchaseOrderLine[],
                amount: amount,
            }
        })
    }, [setFormData])

    const handleRemoveLine = useCallback((index: number) => {
        setFormData((prev) => {
            if (!prev.lines || index < 0 || index >= prev.lines.length) {
                throw new Error(`[CRITICAL] Cannot remove purchase order line at index ${index}: Lines missing or index out of bounds`);
            }

            const nextRawLines = prev.lines.filter((_, i) => i !== index)
            
            // [PREVIEW-ONLY] 重新计算预览统计 (重新编号)
            const { lines: reindexedLines, amount } = previewOrderTotals(nextRawLines)

            return {
                ...prev,
                lines: reindexedLines as PurchaseOrderLine[],
                amount: amount,
            }
        })
    }, [setFormData])

    const updateLine = useCallback(
        (index: number, field: keyof PurchaseOrderLine, value: PurchaseOrderLineFieldValue, extraData?: Partial<PurchaseOrderLine>) => {
            setFormData((prev) => {
                const nextLines = [...(prev.lines || [])]
                const targetLine = nextLines[index]

                if (!targetLine) {
                    throw new Error(`[CRITICAL] Update failed: Purchase line at index ${index} not found in state`);
                }

                // 1. 基础值更新
                nextLines[index] = { ...targetLine, [field]: value, ...extraData }

                // 2. [PREVIEW-ONLY] 单行预览计算
                if (field === 'qty' || field === 'price' || extraData) {
                    const q = Number(nextLines[index].qty) || 0
                    const p = Number(nextLines[index].price) || 0
                    nextLines[index].amount = previewLineAmount(q, p)
                }

                // 3. [PREVIEW-ONLY] 全单预览计算
                const { lines: reindexedLines, amount } = previewOrderTotals(nextLines)
                
                return {
                    ...prev,
                    lines: reindexedLines as PurchaseOrderLine[],
                    amount: amount,
                }
            })
        },
        [setFormData]
    )

    const validate = (): boolean => {
        if (!formData.supplierId) {
            logger.error('Validation failed: missing supplierId in formData', formData)
            toast.error(t('purchase.orders.validation.supplierRequired'))
            return false
        }

        if (!formData.lines || formData.lines.length === 0) {
            toast.error(t('purchase.orders.validation.linesRequired'))
            return false
        }

        const hasInvalidLine = formData.lines.some(
            (line) => !line.materialName || (Number(line.qty) || 0) <= 0
        )
        if (hasInvalidLine) {
            toast.error(t('purchase.orders.validation.lineInvalid'))
            return false
        }

        return true
    }

    return {
        formData,
        handleHeaderChange,
        handleAddLine,
        handleRemoveLine,
        updateLine,
        validate,
        commit,
    }
}
