import { useCallback } from 'react'
import { auditUtils } from '@/lib/audit-utils'
import { type DeltaSet } from '@/lib/delta/types'
import { useAuthStore } from '@/stores/auth-store'
import { type SalesOrder, type SalesOrderLine } from '../data/schema'
import { useSalesOrderMutations } from '../sales'

type SaveMutationKind =
  | 'customer'
  | 'lineContent'
  | 'lineAdd'
  | 'lineRemove'
  | 'lines'
  | 'classificationType'
  | 'deliveryDate'
  | 'cancel'
  | 'statusTransition'
  | 'purchaseOrderNo'
  | 'requirements'
  | 'patch'

interface SaveMutationPlan {
  kind: SaveMutationKind
}

interface UseSalesOrderSaveOptions {
  order?: SalesOrder | null
  validate: () => boolean
  prepareToSave: () => Promise<SalesOrder | undefined>
  commit: () => DeltaSet
  onSaved: () => void
}

const isLineStructureChanged = (previousLines: SalesOrderLine[], nextLines: SalesOrderLine[]) => {
  const previousLineNos = previousLines.map((line) => line.lineNo).sort((a, b) => a - b)
  const nextLineNos = nextLines.map((line) => line.lineNo).sort((a, b) => a - b)

  if (previousLineNos.length !== nextLineNos.length) {
    return true
  }

  return previousLineNos.some((lineNo, index) => lineNo !== nextLineNos[index])
}

const isPureLineAdd = (previousLines: SalesOrderLine[], nextLines: SalesOrderLine[]) => {
  if (nextLines.length <= previousLines.length) {
    return false
  }

  const previousByLineNo = new Map(previousLines.map((line) => [line.lineNo, line]))
  let addedCount = 0

  for (const line of nextLines) {
    const previousLine = previousByLineNo.get(line.lineNo)
    if (!previousLine) {
      addedCount++
      continue
    }

    if (JSON.stringify(previousLine) !== JSON.stringify(line)) {
      return false
    }
  }

  return addedCount > 0
}

const isPureLineRemove = (previousLines: SalesOrderLine[], nextLines: SalesOrderLine[]) => {
  if (nextLines.length >= previousLines.length) {
    return false
  }

  const nextByLineNo = new Map(nextLines.map((line) => [line.lineNo, line]))
  let removedCount = 0

  for (const line of previousLines) {
    const nextLine = nextByLineNo.get(line.lineNo)
    if (!nextLine) {
      removedCount++
      continue
    }

    if (JSON.stringify(nextLine) !== JSON.stringify(line)) {
      return false
    }
  }

  return removedCount > 0
}

const buildSaveMutationPlan = (
  order: SalesOrder,
  finalData: SalesOrder,
  delta: DeltaSet,
): SaveMutationPlan | null => {
  const deltaKeys = Object.keys(delta)
  if (deltaKeys.length === 0) {
    return null
  }

  const isCustomerOnlyChange = deltaKeys.every((key) => key === 'customerId' || key === 'customerName')
  const isLinesOnlyChange = deltaKeys.every((key) => key === 'lines' || key === 'quantity' || key === 'amount')
  const isClassificationTypeOnlyChange = deltaKeys.every((key) => key === 'classification' || key === 'type' || key === 'barcode')
  const isDeliveryDateOnlyChange = deltaKeys.every((key) => key === 'deliveryDate')
  const isStatusFlowOnlyChange = deltaKeys.every((key) => key === 'status' || key === 'statusNote')
  const isPurchaseOrderNoOnlyChange = deltaKeys.every((key) => key === 'purchaseOrderNo')
  const isRequirementsOnlyChange = deltaKeys.every((key) => key === 'requirements')

  if (isCustomerOnlyChange) {
    return { kind: 'customer' }
  }

  if (isLinesOnlyChange) {
    const previousLines = order.lines || []
    const nextLines = finalData.lines || []

    if (!isLineStructureChanged(previousLines, nextLines)) {
      return { kind: 'lineContent' }
    }

    if (isPureLineAdd(previousLines, nextLines)) {
      return { kind: 'lineAdd' }
    }

    if (isPureLineRemove(previousLines, nextLines)) {
      return { kind: 'lineRemove' }
    }

    return { kind: 'lines' }
  }

  if (isClassificationTypeOnlyChange) {
    return { kind: 'classificationType' }
  }

  if (isDeliveryDateOnlyChange) {
    return { kind: 'deliveryDate' }
  }

  if (isStatusFlowOnlyChange) {
    return {
      kind: (finalData.status || order.status) === 'Canceled' ? 'cancel' : 'statusTransition',
    }
  }

  if (isPurchaseOrderNoOnlyChange) {
    return { kind: 'purchaseOrderNo' }
  }

  if (isRequirementsOnlyChange) {
    return { kind: 'requirements' }
  }

  return { kind: 'patch' }
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
      const plan = buildSaveMutationPlan(order, finalData, delta)

      if (!plan) {
        onSaved()
        return
      }

      switch (plan.kind) {
        case 'customer':
          await customerChangeMutation.mutateAsync({
            orderId: order.id,
            customerId: finalData.customerId,
            customerName: finalData.customerName || '',
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'lineContent':
          await lineContentChangeMutation.mutateAsync({
            orderId: order.id,
            lines: finalData.lines || [],
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'lineAdd':
          await lineAddMutation.mutateAsync({
            orderId: order.id,
            lines: finalData.lines || [],
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'lineRemove':
          await lineRemoveMutation.mutateAsync({
            orderId: order.id,
            lines: finalData.lines || [],
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'lines':
          await linesChangeMutation.mutateAsync({
            orderId: order.id,
            lines: finalData.lines || [],
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'classificationType':
          await classificationTypeChangeMutation.mutateAsync({
            orderId: order.id,
            classification: finalData.classification,
            type: finalData.type,
            barcode: finalData.barcode,
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'deliveryDate':
          await deliveryDateChangeMutation.mutateAsync({
            orderId: order.id,
            deliveryDate: finalData.deliveryDate || '',
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'cancel':
          await cancelMutation.mutateAsync({
            orderId: order.id,
            reason: finalData.statusNote || '',
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'statusTransition':
          await statusTransitionMutation.mutateAsync({
            orderId: order.id,
            status: finalData.status || order.status,
            statusNote: finalData.statusNote || '',
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'purchaseOrderNo':
          await purchaseOrderNoChangeMutation.mutateAsync({
            orderId: order.id,
            purchaseOrderNo: finalData.purchaseOrderNo || '',
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'requirements':
          await requirementsChangeMutation.mutateAsync({
            orderId: order.id,
            requirements: finalData.requirements || '',
            operator,
            actorId,
            expectedVersion: order.version,
          })
          break
        case 'patch':
          await patchMutation.mutateAsync({
            id: order.id,
            delta,
            version: order.version,
          })
          break
      }

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
