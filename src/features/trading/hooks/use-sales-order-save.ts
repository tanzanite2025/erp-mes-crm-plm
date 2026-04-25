import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { auditUtils } from '@/lib/audit-utils'
import { type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder, type SalesOrderFormValues } from '../data/schema'
import { useSalesOrderMutations } from '../sales'
import { requireTradingCommandActor } from '../utils/command-actor'

interface UseSalesOrderSaveOptions {
  order?: SalesOrder | null
  validate: () => boolean
  prepareToSave: () => Promise<SalesOrderFormValues | undefined>
  commit: () => DeltaSet
  canSave?: boolean
  onSaved: () => void
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

    try {
      if (!order) {
        const stampedData = auditUtils.stamp(submitValues, 'create')
        await createMutation.mutateAsync(stampedData)
        onSaved()
        return
      }

      const delta = commit()
      if (Object.keys(delta).length === 0) {
        onSaved()
        return
      }

      const actor = requireTradingCommandActor(
        { operator: user?.accountNo, actorId: user?.id },
        'useSalesOrderSave.handleSave'
      )
      await saveMutation.mutateAsync({
        orderId: order.id,
        delta,
        finalData: submitValues,
        operator: actor.operator,
        actorId: actor.actorId,
        expectedVersion: order.version,
      })

      onSaved()
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
    user?.accountNo,
    user?.id,
    validate,
  ])

  return {
    handleSave,
  }
}
