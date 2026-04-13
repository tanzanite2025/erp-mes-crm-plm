import { DocumentEvidenceManager } from '@/features/sales-document/components/document-evidence-manager'
import { type OrderEvidence } from '../../data/schema'

interface OrderEvidenceManagerProps {
  evidences: OrderEvidence[]
  onChange: (evidences: OrderEvidence[]) => void
  disabled?: boolean
  uploadPath?: string
}

export function OrderEvidenceManager(props: OrderEvidenceManagerProps) {
  return <DocumentEvidenceManager {...props} />
}
