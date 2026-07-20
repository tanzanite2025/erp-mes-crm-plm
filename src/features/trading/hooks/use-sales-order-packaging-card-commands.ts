import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { requireCommandActor } from '@/lib/command-actor'
import type { PackagingProfile } from '@/features/logistics-config/packaging-rules-service'
import type { SalesOrder } from '../data/schema'
import { useSalesOrderMutations } from '../sales'
import { buildSalesOrderLinePackagingSelection } from '../utils/sales-order-packaging-selection'

export function useSalesOrderPackagingCardCommands() {
  const user = useAuthStore((state) => state.user)
  const accountNo = user?.accountNo
  const actorId = user?.id
  const { lineContentChangeMutation } = useSalesOrderMutations()

  const persistLineSelection = useCallback(
    async (order: SalesOrder, lineNo: number, profile: PackagingProfile) => {
      let actor
      try {
        actor = requireCommandActor(
          { operator: accountNo, actorId },
          'SalesOrderPackagingCard.persistLineSelection'
        )
      } catch {
        return
      }

      try {
        await lineContentChangeMutation.mutateAsync({
          orderId: order.id,
          lines: order.lines.map((line) =>
            line.lineNo === lineNo
              ? {
                  ...line,
                  selectedPackaging: buildSalesOrderLinePackagingSelection(
                    profile,
                    'manual'
                  ),
                }
              : line
          ),
          operator: actor.operator,
          actorId: actor.actorId,
          expectedVersion: order.version,
        })
      } catch {
        return
      }
    },
    [accountNo, actorId, lineContentChangeMutation]
  )

  return {
    persistLineSelection,
    isSelectionPending: lineContentChangeMutation.isPending,
  }
}
