import { useCallback } from 'react'
import { auditUtils } from '@/lib/audit-utils'
import { type DeltaSet } from '@/lib/delta/types'
import { useAuthStore } from '@/stores/auth-store'
import { type SalesOrder } from '../data/schema'
import { useSalesOrderMutations } from '../sales'

interface UseSalesOrderSaveOptions {
  order?: SalesOrder | null
  validate: () => boolean
  prepareToSave: () => Promise<SalesOrder | undefined>
  commit: () => DeltaSet
  onSaved: () => void
}

export function useSalesOrderSave({
  order,
  validate,
  prepareToSave,
  commit,
  onSaved,
}: UseSalesOrderSaveOptions) {
  const user = useAuthStore((state) => state.user)
  const operator = user?.accountNo || 'Unknown'
  const actorId = user?.id

  const {
    createMutation,
    saveMutation,
  } = useSalesOrderMutations()

  const handleSave = useCallback(async () => {
    if (!validate()) {
      return
    }

    const finalData = await prepareToSave()
    if (!finalData) {
      return
    }

    try {
      if (!order) {
        const stampedData = auditUtils.stamp(finalData, 'create')
        await createMutation.mutateAsync(stampedData)
        onSaved()
        return
      }

      const delta = commit()
      if (Object.keys(delta).length === 0) {
        onSaved()
        return
      }

      await saveMutation.mutateAsync({
        orderId: order.id,
        delta,
        finalData,
        operator,
        actorId,
        expectedVersion: order.version,
      })

      onSaved()
    } catch (_error) {
      // Mutation onError handlers already surface the failure to the user.
    }
  }, [
    actorId,
    commit,
    createMutation,
    onSaved,
    operator,
    order,
    prepareToSave,
    saveMutation,
    validate,
  ])

  return {
    handleSave,
  }
}
