import { ChapteredBusinessOperationGuidePage } from '@/components/chaptered-business-operation-guide-page'
import { salesOperationGuideDefinition } from '../data/sales-operation-guide-chapter-definitions'

export function SalesOperationGuidePage() {
  return (
    <ChapteredBusinessOperationGuidePage
      guide={salesOperationGuideDefinition}
    />
  )
}
