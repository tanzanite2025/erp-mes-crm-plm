import { ChapteredBusinessOperationGuidePage } from '@/components/chaptered-business-operation-guide-page'
import { purchaseOperationGuideDefinition } from '../data/purchase-operation-guide-chapter-definitions'

export function PurchaseOperationGuidePage() {
  return (
    <ChapteredBusinessOperationGuidePage
      guide={purchaseOperationGuideDefinition}
    />
  )
}
