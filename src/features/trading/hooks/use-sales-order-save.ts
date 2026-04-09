import { useCallback } from 'react'
import { auditUtils } from '@/lib/audit-utils'
import { type DeltaSet } from '@/lib/delta/types'
import { useAuthStore } from '@/stores/auth-store'
import { type SalesOrder } from '../data/schema'
import { useSalesOrderMutations } from '../sales'
import { executeSalesOrderSavePlan } from './sales-order-save-executor'
import { buildSalesOrderSavePlan } from './sales-order-save-plan'

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
    patchMutation,
    customerChangeMutation,
    deliveryDateChangeMutation,
    purchaseOrderNoChangeMutation,
    requirementsChangeMutation,
    classificationTypeChangeMutation,
    linesChangeMutation,
    lineContentChangeMutation,
    lineAddMutation,
    lineRemoveMutation,
    statusTransitionMutation,
    cancelMutation,
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
      const plan = buildSalesOrderSavePlan(order, finalData, delta)
      if (!plan) {
        onSaved()
        return
      }

      await executeSalesOrderSavePlan({
        order,
        finalData,
        delta,
        plan,
        context: {
          operator,
          actorId,
        },
        mutations: {
          create: (payload) => createMutation.mutateAsync(payload),
          patch: (payload) => patchMutation.mutateAsync(payload),
          customerChange: (payload) => customerChangeMutation.mutateAsync(payload),
          deliveryDateChange: (payload) => deliveryDateChangeMutation.mutateAsync(payload),
          purchaseOrderNoChange: (payload) => purchaseOrderNoChangeMutation.mutateAsync(payload),
          requirementsChange: (payload) => requirementsChangeMutation.mutateAsync(payload),
          classificationTypeChange: (payload) => classificationTypeChangeMutation.mutateAsync(payload),
          linesChange: (payload) => linesChangeMutation.mutateAsync(payload),
          lineContentChange: (payload) => lineContentChangeMutation.mutateAsync(payload),
          lineAdd: (payload) => lineAddMutation.mutateAsync(payload),
          lineRemove: (payload) => lineRemoveMutation.mutateAsync(payload),
          statusTransition: (payload) => statusTransitionMutation.mutateAsync(payload),
          cancel: (payload) => cancelMutation.mutateAsync(payload),
        },
      })

      onSaved()
    } catch (_error) {
      // Mutation onError handlers already surface the failure to the user.
    }
  }, [
    actorId,
    cancelMutation,
    classificationTypeChangeMutation,
    commit,
    createMutation,
    customerChangeMutation,
    deliveryDateChangeMutation,
    lineAddMutation,
    lineContentChangeMutation,
    lineRemoveMutation,
    linesChangeMutation,
    onSaved,
    operator,
    order,
    patchMutation,
    prepareToSave,
    purchaseOrderNoChangeMutation,
    requirementsChangeMutation,
    statusTransitionMutation,
    validate,
  ])

  return {
    handleSave,
  }
}
