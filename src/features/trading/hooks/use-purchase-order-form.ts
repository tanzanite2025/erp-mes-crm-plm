import { useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { financeService } from '@/features/finance/services/finance-service'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth-store'
import { type PurchaseOrder, type PurchaseOrderLine } from '../data/schema'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'

const logger = createLogger('usePurchaseOrderForm')

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

    const handleHeaderChange = useCallback(async (field: keyof PurchaseOrder, value: any) => {
        if (field === 'currency') {
            try {
                const currencies = await financeService.getCurrencies()
                const target = currencies.find((c: any) => c.code === value)
                formData[field] = value
                if (target) {
                    formData.exchangeRate = target.rate
                }
            } catch (error) {
                logger.error('Failed to fetch exchange rate', error)
                formData[field] = value
            }
        } else {
            ;(formData as any)[field] = value
        }
    }, [formData])

    useEffect(() => {
        if (!open || initialOrder) return

        const newId = `PO${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`
        formData.id = newId
        formData.orderNo = newId
        formData.orderDate = new Date().toISOString().split('T')[0]
        formData.purchaser = purchaserName
        formData.lines = [{ ...emptyLine, lineNo: 1 } as PurchaseOrderLine]
    }, [open, initialOrder, formData, purchaserName])

    const handleAddLine = useCallback(() => {
        const nextLineNo = (formData.lines?.length || 0) + 1
        formData.lines = [...(formData.lines || []), { ...emptyLine, lineNo: nextLineNo } as PurchaseOrderLine]
    }, [formData])

    const handleRemoveLine = useCallback((index: number) => {
        const nextLines = (formData.lines || []).filter((_, i) => i !== index)
        formData.lines = nextLines.map((line, i) => ({ ...line, lineNo: i + 1 }))
    }, [formData])

    const updateLine = useCallback(
        (index: number, field: keyof PurchaseOrderLine, value: any, extraData?: Partial<PurchaseOrderLine>) => {
            if (!formData.lines) return
            const nextLines = [...formData.lines]
            if (!nextLines[index]) return

            nextLines[index] = { ...nextLines[index], [field]: value, ...extraData }

            if (field === 'qty' || field === 'price' || extraData) {
                const q = Number(nextLines[index].qty) || 0
                const p = Number(nextLines[index].price) || 0
                nextLines[index].amount = Number((q * p).toFixed(2))
            }

            formData.lines = nextLines
            formData.amount = nextLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
        },
        [formData]
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
