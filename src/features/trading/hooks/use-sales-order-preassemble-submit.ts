import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { warehouseQueryKeys } from '@/features/warehouse/query-keys'
import { ShipmentTransactionService } from '@/features/warehouse/shipment'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder } from '../data/schema'
import { tradingQueryKeys } from '../query-keys'
import { isSalesOrderPreassembleScanAllowed } from '../utils/sales-order-preassemble'
import { type SalesOrderPreassembleConfirmPayload } from '../components/sales-order-preassemble-scan-dialog'

export function useSalesOrderPreassembleSubmit() {
  const queryClient = useQueryClient()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const [preassembleScanOrder, setPreassembleScanOrder] = useState<SalesOrder | null>(null)
  const [isSubmittingPreassemble, setIsSubmittingPreassemble] = useState(false)

  const handleOpenPreassembleScan = (order: SalesOrder) => {
    if (!isSalesOrderPreassembleScanAllowed(order)) return

    runConfirmedAction({
      permission: 'action_inventory_shipment_update',
      onAction: () => {
        setPreassembleScanOrder(order)
      },
    })
  }

  const handleClosePreassembleScan = () => {
    if (!isSubmittingPreassemble) {
      setPreassembleScanOrder(null)
    }
  }

  const handlePreassembleConfirm = (payload: SalesOrderPreassembleConfirmPayload) => {
    runConfirmedAction({
      permission: 'action_inventory_shipment_update',
      onAction: async () => {
        if (isSubmittingPreassemble) return
        setIsSubmittingPreassemble(true)

        try {
          let patchedCount = 0

          await Promise.all(
            payload.entries.map(async (entry) => {
              const delta: DeltaSet = {}

              if (entry.currentSalesOrderId !== payload.orderId) {
                delta.salesOrderId = {
                  o: entry.currentSalesOrderId,
                  n: payload.orderId,
                }
              }
              if (entry.currentSalesOrderLineId !== entry.targetSalesOrderLineId) {
                delta.salesOrderLineId = {
                  o: entry.currentSalesOrderLineId,
                  n: entry.targetSalesOrderLineId,
                }
              }
              if (entry.currentOrderNo !== payload.orderNo) {
                delta.orderNo = {
                  o: entry.currentOrderNo,
                  n: payload.orderNo,
                }
              }

              if (Object.keys(delta).length === 0) {
                return
              }

              await ShipmentTransactionService.patchShipmentDraft(
                entry.shipmentId,
                delta,
                entry.version
              )
              patchedCount += 1
            })
          )

          await Promise.all([
            queryClient.invalidateQueries({ queryKey: tradingQueryKeys.salesOrdersRoot() }),
            queryClient.invalidateQueries({ queryKey: tradingQueryKeys.salesOrderDetail(payload.orderId) }),
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.shipmentHistory() }),
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.shipmentDemands() }),
          ])

          toast.success(
            patchedCount > 0
              ? `扫码预装已保存（${patchedCount} 条）`
              : '扫码结果已确认（无绑定变更）'
          )
          setPreassembleScanOrder(null)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : '扫码预装保存失败')
        } finally {
          setIsSubmittingPreassemble(false)
        }
      },
    })
  }

  return {
    preassembleScanOrder,
    isSubmittingPreassemble,
    handleOpenPreassembleScan,
    handleClosePreassembleScan,
    handlePreassembleConfirm,
    isPreassembleDialogOpen: isSalesOrderPreassembleScanAllowed(preassembleScanOrder),
  }
}
