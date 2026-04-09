import { type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder, type SalesOrderLine } from '../data/schema'

export type SaveMutationKind =
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

export interface SaveMutationPlan {
  kind: SaveMutationKind
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

export const buildSalesOrderSavePlan = (
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
