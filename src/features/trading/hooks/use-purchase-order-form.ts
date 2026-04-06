import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { financeService } from '@/features/finance/services/finance-service'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth-store'
import { type PurchaseOrder, type PurchaseOrderLine } from '../data/schema'

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

export function usePurchaseOrderForm(initialOrder: PurchaseOrder | null | undefined, open: boolean) {
    const user = useAuthStore((state) => state.user)
    const { t } = useLanguage()
    const purchaserName = user?.username || user?.accountNo || ''
    const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
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
        purchaser: purchaserName,
        paymentTerm: '',
        note: '',
    })

    const handleHeaderChange = useCallback(async (field: keyof PurchaseOrder, value: any) => {
        if (field === 'currency') {
            try {
                const currencies = await financeService.getCurrencies()
                const target = currencies.find((c: any) => c.code === value)
                setFormData((prev) => ({
                    ...prev,
                    [field]: value,
                    exchangeRate: target ? target.rate : prev.exchangeRate,
                }))
            } catch (error) {
                logger.error('Failed to fetch exchange rate', error)
                setFormData((prev) => ({ ...prev, [field]: value }))
            }
        } else {
            setFormData((prev) => ({ ...prev, [field]: value }))
        }
    }, [])

    useEffect(() => {
        if (!open) {
            return
        }

        if (initialOrder) {
            setFormData(initialOrder)
            return
        }

        const newId = `PO${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`
        setFormData({
            id: newId,
            orderNo: newId,
            supplierName: '',
            supplierId: '',
            currency: 'CNY',
            exchangeRate: 1.0,
            orderDate: new Date().toISOString().split('T')[0],
            expectedDate: '',
            status: 'Draft',
            lines: [{ ...emptyLine, lineNo: 1 } as PurchaseOrderLine],
            amount: 0,
            purchaser: purchaserName,
            paymentTerm: '',
            note: '',
        })
    }, [initialOrder, open, purchaserName])

    const handleAddLine = useCallback(() => {
        setFormData((prev) => {
            const nextLineNo = (prev.lines?.length || 0) + 1
            return {
                ...prev,
                lines: [...(prev.lines || []), { ...emptyLine, lineNo: nextLineNo } as PurchaseOrderLine],
            }
        })
    }, [])

    const handleRemoveLine = useCallback((index: number) => {
        setFormData((prev) => {
            const nextLines = (prev.lines || []).filter((_, i) => i !== index)
            const reindexed = nextLines.map((line, i) => ({ ...line, lineNo: i + 1 }))
            return { ...prev, lines: reindexed }
        })
    }, [])

    const updateLine = useCallback(
        (index: number, field: keyof PurchaseOrderLine, value: any, extraData?: Partial<PurchaseOrderLine>) => {
            setFormData((prev) => {
                const nextLines = [...(prev.lines || [])]
                if (!nextLines[index]) return prev

                nextLines[index] = { ...nextLines[index], [field]: value, ...extraData }

                if (field === 'qty' || field === 'price' || extraData) {
                    const q = Number(nextLines[index].qty) || 0
                    const p = Number(nextLines[index].price) || 0
                    nextLines[index].amount = Number((q * p).toFixed(2))
                }

                const totalAmount = nextLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)

                return {
                    ...prev,
                    lines: nextLines,
                    amount: totalAmount,
                }
            })
        },
        []
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
        setFormData,
        handleHeaderChange,
        handleAddLine,
        handleRemoveLine,
        updateLine,
        validate,
    }
}
