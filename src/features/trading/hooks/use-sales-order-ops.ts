import { useCallback } from 'react'
import {
  type SalesOrderFormValues,
  type SalesOrderLine,
  createEmptySalesOrderLine,
} from '../data/schema'
import {
  previewLineAmount,
  previewOrderTotals,
} from '@/lib/order-preview-calc'

type SalesOrderLineFieldValue = SalesOrderLine[keyof SalesOrderLine]

/**
 * useSalesOrderOps - 负责销售订单明细行的 CRUD 操作及前端预览重算逻辑。
 *
 * ⚠️ 架构约束：
 * 所有的量值（quantity, amount）计算在此 Hook 中仅作为 UI 预览使用。
 * 系统的最终权威数据由 Go 后端计算引擎在提交时重算生成。
 */
export function useSalesOrderOps(
  setFormData: React.Dispatch<React.SetStateAction<SalesOrderFormValues>>
) {
  /**
   * 添加新行
   */
  const handleAddLine = useCallback(() => {
    setFormData((prev) => {
      const lines = prev.lines || []
      const nextRawLines = [...lines, createEmptySalesOrderLine()]

      // [PREVIEW-ONLY] 重新计算预览统计
      const {
        lines: reindexedLines,
        quantity,
        amount,
      } = previewOrderTotals(nextRawLines)

      return {
        ...prev,
        lines: reindexedLines,
        quantity,
        amount,
      }
    })
  }, [setFormData])

  /**
   * 删除行
   */
  const handleRemoveLine = useCallback(
    (index: number) => {
      setFormData((prev) => {
        if (!prev.lines || index < 0 || index >= prev.lines.length) {
          return prev
        }

        const nextRawLines = prev.lines.filter(
          (_, lineIndex) => lineIndex !== index
        )

        // [PREVIEW-ONLY] 重新计算预览统计
        const {
          lines: reindexedLines,
          quantity,
          amount,
        } = previewOrderTotals(nextRawLines)

        return {
          ...prev,
          lines: reindexedLines,
          quantity,
          amount,
        }
      })
    },
    [setFormData]
  )

  /**
   * 更新行字段
   */
  const updateLine = useCallback(
    (
      index: number,
      field: keyof SalesOrderLine,
      value: SalesOrderLineFieldValue,
      extraData?: Partial<SalesOrderLine>
    ) => {
      setFormData((prev) => {
        const nextLines = [...(prev.lines || [])]
        const targetLine = nextLines[index]

        if (!targetLine) {
          return prev
        }

        // 1. 基本字段更新
        let finalValue = value
        if (field === 'qty' || field === 'price' || field === 'holeCount') {
          finalValue = Number(value) || 0
        }

        nextLines[index] = { ...targetLine, [field]: finalValue, ...extraData }

        // 2. [PREVIEW-ONLY] 单行金额预览计算
        // 仅当涉及计算因子变更时触发
        if (field === 'qty' || field === 'price' || extraData) {
          const qty = Number(nextLines[index].qty) || 0
          const price = Number(nextLines[index].price) || 0
          nextLines[index].amount = previewLineAmount(qty, price)
        }

        // 3. [PREVIEW-ONLY] 全单统计预览
        const {
          lines: reindexedLines,
          quantity,
          amount,
        } = previewOrderTotals(nextLines)

        return {
          ...prev,
          lines: reindexedLines,
          quantity,
          amount,
        }
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
