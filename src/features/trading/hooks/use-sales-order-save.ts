import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { auditUtils } from '@/lib/audit-utils'
import { type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder, type SalesOrderFormValues } from '../data/schema'
import { useSalesOrderMutations } from '../sales'
import { requireCommandActor } from '@/lib/command-actor'
import {
  sanitizeSalesOrderDelta,
  sanitizeSalesOrderSubmitValues,
} from '../utils/sales-order-submit'

interface UseSalesOrderSaveOptions {
  order?: SalesOrder | null
  validate: () => boolean
  prepareToSave: () => Promise<SalesOrderFormValues | undefined>
  commit: () => DeltaSet
  canSave?: boolean
  onSaved: (order: SalesOrder) => void
}

export function useSalesOrderSave({
  order,
  validate,
  prepareToSave,
  commit,
  canSave = true,
  onSaved,
}: UseSalesOrderSaveOptions) {
  const user = useAuthStore((state) => state.user)

  const { createMutation, saveMutation } = useSalesOrderMutations()

  const handleSave = useCallback(async () => {
    if (!canSave) {
      return
    }

    if (!validate()) {
      return
    }

    const submitValues = await prepareToSave()
    if (!submitValues) {
      return
    }
    const sanitizedSubmitValues = sanitizeSalesOrderSubmitValues(submitValues)

    try {
      if (!order) {
        const stampedData = auditUtils.stamp(sanitizedSubmitValues, 'create')
        const createdOrder = await createMutation.mutateAsync(stampedData)
        onSaved(createdOrder)
        return
      }

      const delta = sanitizeSalesOrderDelta(commit(), order)
      if (Object.keys(delta).length === 0) {
        onSaved(order)
        return
      }

      const actor = requireCommandActor(
        { operator: user?.accountNo, actorId: user?.id },
        'useSalesOrderSave.handleSave'
      )
      const savedOrder = await saveMutation.mutateAsync({
        orderId: order.id,
        delta,
        finalData: sanitizedSubmitValues,
        operator: actor.operator,
        actorId: actor.actorId,
        expectedVersion: order.version,
      })

      onSaved(savedOrder)
    } catch (_error) {
      // Mutation onError handlers already surface the failure to the user.
    }
  }, [
    canSave,
    commit,
    createMutation,
    onSaved,
    order,
    prepareToSave,
    saveMutation,
    user,
    validate,
  ])

  return {
    handleSave,
  }
}
