import { useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { financeService, type Currency } from '@/features/finance/services/finance-service'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth-store'
import { type PurchaseOrder, type PurchaseOrderLine } from '../data/schema'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'

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
    paymentTerm: '',
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
                const currencies = await financeService.getCurrencies()
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

        const newId = `PO${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`
        setFormData((prev) => ({
            ...prev,
            id: newId,
            orderNo: newId,
            orderDate: new Date().toISOString().split('T')[0],
            purchaser: purchaserName,
            lines: [{ ...emptyLine, lineNo: 1 } as PurchaseOrderLine],
        }))
    }, [open, initialOrder, purchaserName, setFormData])

    const handleAddLine = useCallback(() => {
        const nextLineNo = (formData.lines?.length || 0) + 1
        setFormData((prev) => ({
            ...prev,
            lines: [...(prev.lines || []), { ...emptyLine, lineNo: nextLineNo } as PurchaseOrderLine],
        }))
    }, [formData.lines, setFormData])

    const handleRemoveLine = useCallback((index: number) => {
        const nextLines = (formData.lines || []).filter((_, i) => i !== index)
        setFormData((prev) => ({
            ...prev,
            lines: nextLines.map((line, i) => ({ ...line, lineNo: i + 1 })),
        }))
    }, [formData.lines, setFormData])

    const updateLine = useCallback(
        (index: number, field: keyof PurchaseOrderLine, value: PurchaseOrderLineFieldValue, extraData?: Partial<PurchaseOrderLine>) => {
            if (!formData.lines) return
            const nextLines = [...formData.lines]
            if (!nextLines[index]) return

            nextLines[index] = { ...nextLines[index], [field]: value, ...extraData }

            if (field === 'qty' || field === 'price' || extraData) {
                const q = Number(nextLines[index].qty) || 0
                const p = Number(nextLines[index].price) || 0
                nextLines[index].amount = Number((q * p).toFixed(2))
            }

            setFormData((prev) => ({
                ...prev,
                lines: nextLines,
                amount: nextLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
            }))
        },
        [formData.lines, setFormData]
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
