import { useCallback } from 'react'
import { type SalesOrder, type SalesOrderLine, EMPTY_SALES_ORDER_LINE } from '../data/schema'
import { calculateLineAmount, recalculateOrderTotals } from '../utils/sales-order-calc'

type SalesOrderLineFieldValue = SalesOrderLine[keyof SalesOrderLine]

export function useSalesOrderOps(
  setFormData: React.Dispatch<React.SetStateAction<Partial<SalesOrder>>>
) {
  const handleAddLine = useCallback(() => {
    setFormData((prev) => {
      const nextLines = [...(prev.lines || []), { ...EMPTY_SALES_ORDER_LINE } as SalesOrderLine]
      const { lines, quantity, amount } = recalculateOrderTotals(nextLines)
      return { ...prev, lines, quantity, amount }
    })
  }, [setFormData])

  const handleRemoveLine = useCallback((index: number) => {
    setFormData((prev) => {
      const nextLines = (prev.lines || []).filter((_, lineIndex) => lineIndex !== index)
      const { lines, quantity, amount } = recalculateOrderTotals(nextLines)
      return { ...prev, lines, quantity, amount }
    })
  }, [setFormData])

  const updateLine = useCallback(
    (index: number, field: keyof SalesOrderLine, value: SalesOrderLineFieldValue, extraData?: Partial<SalesOrderLine>) => {
      setFormData((prev) => {
        const nextLines = [...(prev.lines || [])]
        if (!nextLines[index]) return prev
        
        let finalValue = value
        if (field === 'qty' || field === 'price' || field === 'holeCount') {
          finalValue = Number(value) || 0
        }

        nextLines[index] = { ...nextLines[index], [field]: finalValue, ...extraData }

        if (field === 'qty' || field === 'price' || extraData) {
          const qty = Number(nextLines[index].qty) || 0
          const price = Number(nextLines[index].price) || 0
          nextLines[index].amount = calculateLineAmount(qty, price)
        }

        const { lines, quantity, amount } = recalculateOrderTotals(nextLines)
        return { ...prev, lines, quantity, amount }
      })
    },
    [setFormData]
  )

  return {
    handleAddLine,
    handleRemoveLine,
    updateLine,
  }
}
